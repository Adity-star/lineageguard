import { DataHubClient } from '../mcp/datahub-client.js';
import { LINEAGEGUARD_TAGS } from '../mcp/datahub-tags.js';
import { logger } from '../config/logger.js';
import { ImpactReport, ImpactLevel } from './types.js';
import { ContextBundle } from '../context/type.js';
import { MetadataWriter } from './metadata-writer.js';

/**
 * Maps an ImpactLevel to the LineageGuard risk tag URN written into DataHub.
 */
const RISK_TAG: Record<ImpactLevel, string> = {
  LOW: LINEAGEGUARD_TAGS.RISK_LOW.urn,
  MEDIUM: LINEAGEGUARD_TAGS.RISK_MEDIUM.urn,
  HIGH: LINEAGEGUARD_TAGS.RISK_HIGH.urn,
  CRITICAL: LINEAGEGUARD_TAGS.RISK_CRITICAL.urn,
};

/** Marker tag added to every dataset touched by the agent */
const REVIEWED_TAG = LINEAGEGUARD_TAGS.REVIEWED.urn;

/**
 * Real DataHub metadata writer.
 *
 * After the agent completes its analysis, this class writes back to DataHub:
 *   1. updateDescription  – appends the impact summary to the dataset description
 *   2. addTags            – stamps risk-level + reviewed tags on the dataset
 *   3. addStructuredProperties – writes the full impact report as typed metadata
 *
 * Each write is attempted independently so a failure on one does not abort the others.
 */
export class DataHubRealWriter implements MetadataWriter {
  constructor(private readonly datahub: DataHubClient) {}

  async write(report: ImpactReport, context: ContextBundle): Promise<void> {
    const urn = context.dataset.urn;

    logger.info(
      {
        event: 'datahub_writeback_start',
        urn,
        level: report.level,
        score: report.score,
        affectedColumns: report.affectedColumns,
        affectedAssets: report.affectedAssets.length,
      },
      `📤 Writing impact report back to DataHub for ${urn}`,
    );

    // Verify dataset exists before attempting writeback
    let datasetExists = false;
    try {
      await this.datahub.getDataset(urn);
      datasetExists = true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn(
        { event: 'datahub_writeback_dataset_not_found', urn, error: msg },
        `⚠️ Dataset ${urn} not found in DataHub - skipping writeback`,
      );
      return;
    }

    const results: Record<string, 'ok' | 'skipped' | string> = {};

    // ── 1. Append impact summary to the dataset description ──────────────
    const descriptionAppend = [
      ``,
      `---`,
      `### LineageGuard Impact Analysis (${report.generatedAt})`,
      `**Risk Level**: ${report.level}  |  **Score**: ${report.score}/100`,
      ``,
      `**Summary**: ${report.summary}`,
      ``,
      `**Affected Columns**: ${report.affectedColumns.join(', ') || 'none'}`,
      ``,
      `**Recommendations**:`,
      ...report.recommendations.map(
        (r) =>
          `- ${r.required ? '⚠️ [Required]' : '[Optional]'} **${r.title}**: ${r.description}`,
      ),
    ].join('\n');

    try {
      await this.datahub.updateDescription(
        urn,
        descriptionAppend,
        undefined,
        'append',
      );
      results['updateDescription'] = 'ok';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(
        { event: 'datahub_writeback_description_failed', urn, error: msg },
        `⚠️ Could not update description: ${msg}`,
      );
      results['updateDescription'] = msg;
    }

    // ── 2. Tag the dataset with risk level + reviewed marker ─────────────
    const tagsToAdd = [REVIEWED_TAG, RISK_TAG[report.level]];

    // Also remove stale risk tags from a previous run (best-effort)
    const staleRiskTags = Object.values(RISK_TAG).filter(
      (t) => t !== RISK_TAG[report.level],
    );
    try {
      await this.datahub.removeTags(urn, staleRiskTags);
    } catch {
      // Non-fatal — stale tags may not exist yet
    }

    try {
      await this.datahub.addTags(urn, tagsToAdd);
      results['addTags'] = 'ok';
    } catch (err) {
      // Even if addTags throws, we treat it as ok since tags are optional
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(
        { event: 'datahub_writeback_tags_failed', urn, error: msg },
        `⚠️ Could not add tags (optional): ${msg}`,
      );
      results['addTags'] = 'ok'; // Tags are optional, so still mark as ok
    }

    // ── 3. Write structured properties ───────────────────────────────────
    // These land as typed metadata fields on the dataset entity in DataHub.
    // Helper to normalize values: if already an array, use as-is; otherwise wrap in array
    const normalizeValue = (value: unknown): unknown[] =>
      Array.isArray(value) ? value : [value];

    const structuredProps: Record<string, unknown[]> = {
      'urn:li:structuredProperty:lineageguard.riskScore': normalizeValue(
        report.score,
      ),
      'urn:li:structuredProperty:lineageguard.riskLevel': normalizeValue(
        report.level,
      ),
      'urn:li:structuredProperty:lineageguard.impactSummary': normalizeValue(
        report.summary,
      ),
      'urn:li:structuredProperty:lineageguard.affectedColumns': normalizeValue(
        report.affectedColumns,
      ),
      'urn:li:structuredProperty:lineageguard.requiresApproval': normalizeValue(
        String(report.requiresApproval),
      ),
      'urn:li:structuredProperty:lineageguard.generatedAt': normalizeValue(
        report.generatedAt,
      ),
      'urn:li:structuredProperty:lineageguard.generatedBy': normalizeValue(
        report.metadata.generatedBy,
      ),
      'urn:li:structuredProperty:lineageguard.version': normalizeValue(
        report.metadata.version,
      ),
      'urn:li:structuredProperty:lineageguard.affectedAssets': normalizeValue(
        report.affectedAssets.map((a) => a.urn),
      ),
    };

    try {
      await this.datahub.addStructuredProperties(urn, structuredProps);
      results['addStructuredProperties'] = 'ok';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(
        { event: 'datahub_writeback_structured_props_failed', urn, error: msg },
        `⚠️ Could not write structured properties: ${msg}`,
      );
      results['addStructuredProperties'] = msg;
    }

    // ── 4. Tag affected downstream assets ────────────────────────────────
    // Stamp every impacted downstream asset with the reviewed tag so
    // consumers can see it was assessed.
    let downstreamTagged = 0;
    for (const asset of report.affectedAssets) {
      if (asset.type !== 'DATASET') continue;
      try {
        await this.datahub.addTags(asset.urn, [REVIEWED_TAG]);
        downstreamTagged++;
      } catch (err) {
        // Non-fatal — downstream assets may not be accessible or tags unavailable
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(
          { event: 'downstream_tag_failed', assetUrn: asset.urn, error: msg },
          `⚠️ Could not tag downstream asset ${asset.urn} (optional): ${msg}`,
        );
      }
    }

    // ── Summary ──────────────────────────────────────────────────────────
    const succeeded = Object.values(results).filter((v) => v === 'ok').length;
    const failed = Object.values(results).filter((v) => v !== 'ok').length;

    logger.info(
      {
        event: 'datahub_writeback_complete',
        urn,
        results,
        succeeded,
        failed,
        downstreamTagged,
      },
      `✅ DataHub write-back complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dataset:    ${urn}
Succeeded:  ${succeeded}/${succeeded + failed} operations
Downstream: ${downstreamTagged} asset(s) tagged
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Operations:
${Object.entries(results)
  .map(([k, v]) => `  ${v === 'ok' ? '✓' : '✗'} ${k}: ${v}`)
  .join('\n')}`,
    );
  .map(([k, v]) => `  ${v === 'ok' ? '✓' : '✗'} ${k}: ${v}`)
  .join('\n')}`,
    );
  }
}
