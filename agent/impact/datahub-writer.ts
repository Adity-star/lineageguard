import { logger } from '../config/logger.js';
import { MetadataWriter } from './metadata-writer.js';
import { ImpactReport } from './types.js';
import { ContextBundle } from '../context/type.js';

/**
 * No-op writer used in development / mock mode.
 * Logs what would be written without making any DataHub API calls.
 */
export class DataHubWriter implements MetadataWriter {
  async write(report: ImpactReport, context: ContextBundle): Promise<void> {
    logger.info(
      {
        event: 'datahub_write_mock',
        urn: context.dataset.urn,
        summary: report.summary,
        score: report.score,
        level: report.level,
        affectedColumns: report.affectedColumns,
        affectedAssets: report.affectedAssets.length,
        recommendations: report.recommendations.length,
      },
      `[MOCK] Would write impact report to DataHub for ${context.dataset.urn}
  Risk Level: ${report.level}  |  Score: ${report.score}/100
  Summary:    ${report.summary}
  Columns:    ${report.affectedColumns.join(', ') || 'none'}
  Assets:     ${report.affectedAssets.length} downstream`,
    );
  }
}
