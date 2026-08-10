import { MCPClient } from './client.js';
import { SearchTool } from './tools/search.js';
import { EntityTool } from './tools/entities.js';
import { SchemaTool } from './tools/schema.js';
import { LineageTool } from './tools/lineage.js';
import { QueryTool } from './tools/queries.js';
import { DocumentTool } from './tools/documents.js';
import {
  MutationTool,
  MutationResult,
  UpdateDescriptionResponse,
} from './tools/mutations.js';
import { DataHubTagClient, LINEAGEGUARD_TAGS } from './datahub-tags.js';
import { logger } from '../config/logger.js';

import {
  Dataset,
  Lineage,
  SchemaField,
  DatasetQuery,
  Document,
  SearchResult,
} from './types.js';

export type { MutationResult, UpdateDescriptionResponse };

export class DataHubClient {
  readonly search: SearchTool;
  readonly entities: EntityTool;
  readonly schema: SchemaTool;
  readonly lineage: LineageTool;
  readonly queries: QueryTool;
  readonly documents: DocumentTool;
  readonly mutations: MutationTool;
  readonly tags: DataHubTagClient;

  constructor(
    private readonly client: MCPClient,
    private readonly gmsUrl?: string,
    private readonly token?: string,
  ) {
    this.search = new SearchTool(client);
    this.entities = new EntityTool(client);
    this.schema = new SchemaTool(client);
    this.lineage = new LineageTool(client);
    this.queries = new QueryTool(client);
    this.documents = new DocumentTool(client);
    this.mutations = new MutationTool(client, client.getMutationRegistry());

    // Initialize tag client if credentials are provided
    if (gmsUrl && token) {
      this.tags = new DataHubTagClient(gmsUrl, token);
    } else {
      // Create a dummy tag client that will fail gracefully
      this.tags = new DataHubTagClient('', '');
    }
  }

  async initialize() {
    await this.client.initialize();
  }
  async shutdown() {
    await this.client.shutdown();
  }
  isConnected(): boolean {
    return this.client.isConnected();
  }

  /**
   * Check if DataHub is reachable by attempting a ping
   */
  async ping(): Promise<boolean> {
    return this.client.ping();
  }

  // ----------------------------------------------------------------
  // Read methods
  // ----------------------------------------------------------------

  async searchDatasets(query: string, limit = 10): Promise<SearchResult[]> {
    logger.info(
      { event: 'datahub_search_datasets_start', query },
      `Searching dataset: "${query}"...`,
    );
    const start = performance.now();
    try {
      const result = await this.search.searchDatasets(query, limit);
      logger.info(
        {
          event: 'datahub_search_datasets_success',
          durationMs: (performance.now() - start).toFixed(0),
        },
        `Retrieved ${result.data?.length || 0} datasets`,
      );
      return result.data;
    } catch (error) {
      logger.error(
        {
          event: 'datahub_search_datasets_failed',
          error: error instanceof Error ? error.message : String(error),
        },
        `Searching dataset failed`,
      );
      throw error;
    }
  }

  async getDataset(urn: string): Promise<Dataset> {
    logger.info(
      {
        event: 'datahub_get_dataset_start',
        urn,
        isConnected: this.isConnected(),
      },
      `Getting dataset: "${urn}"...`,
    );
    const start = performance.now();
    try {
      const result = await this.entities.getDataset(urn);
      logger.info(
        {
          event: 'datahub_get_dataset_success',
          durationMs: (performance.now() - start).toFixed(0),
          datasetName: result.name,
          datasetUrn: result.urn,
        },
        `Retrieved dataset: ${result.name}`,
      );
      return result;
    } catch (error) {
      const durationMs = (performance.now() - start).toFixed(0);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(
        {
          event: 'datahub_get_dataset_failed',
          urn,
          durationMs,
          error: errorMessage,
          errorType:
            error instanceof Error ? error.constructor.name : typeof error,
          isConnected: this.isConnected(),
        },
        `Getting dataset failed: ${errorMessage}`,
      );
      throw error;
    }
  }

  async getOwners(
    urn: string,
  ): Promise<Array<{ urn: string; name: string; type: string }>> {
    logger.info(
      { event: 'datahub_get_owners_start', urn },
      `Getting owners...`,
    );
    const start = performance.now();
    try {
      const result = await this.entities.getOwners(urn);
      if (result.length === 0) {
        logger.info(
          {
            event: 'datahub_get_owners_empty',
            durationMs: (performance.now() - start).toFixed(0),
          },
          `Owners unavailable, using empty array`,
        );
      } else {
        logger.info(
          {
            event: 'datahub_get_owners_success',
            durationMs: (performance.now() - start).toFixed(0),
            count: result.length,
          },
          `Retrieved ${result.length} owners`,
        );
      }
      return result;
    } catch (error) {
      logger.error(
        {
          event: 'datahub_get_owners_failed',
          error: error instanceof Error ? error.message : String(error),
        },
        `Getting owners failed`,
      );
      throw error;
    }
  }

  async getGlossaryTerms(
    urn: string,
  ): Promise<Array<{ urn: string; name: string; description?: string }>> {
    logger.info(
      { event: 'datahub_get_glossary_terms_start', urn },
      `Getting glossary terms...`,
    );
    const start = performance.now();
    try {
      const result = await this.entities.getGlossaryTerms(urn);
      if (result.length === 0) {
        logger.info(
          {
            event: 'datahub_get_glossary_terms_empty',
            durationMs: (performance.now() - start).toFixed(0),
          },
          `Glossary terms unavailable, using empty array`,
        );
      } else {
        logger.info(
          {
            event: 'datahub_get_glossary_terms_success',
            durationMs: (performance.now() - start).toFixed(0),
            count: result.length,
          },
          `Retrieved ${result.length} glossary terms`,
        );
      }
      return result;
    } catch (error) {
      logger.error(
        {
          event: 'datahub_get_glossary_terms_failed',
          error: error instanceof Error ? error.message : String(error),
        },
        `Getting glossary terms failed`,
      );
      throw error;
    }
  }

  async getTags(urn: string): Promise<string[]> {
    logger.info({ event: 'datahub_get_tags_start', urn }, `Getting tags...`);
    const start = performance.now();
    try {
      const result = await this.entities.getTags(urn);
      if (result.length === 0) {
        logger.info(
          {
            event: 'datahub_get_tags_empty',
            durationMs: (performance.now() - start).toFixed(0),
          },
          `Tags unavailable, using empty array`,
        );
      } else {
        logger.info(
          {
            event: 'datahub_get_tags_success',
            durationMs: (performance.now() - start).toFixed(0),
            count: result.length,
          },
          `Retrieved ${result.length} tags`,
        );
      }
      return result;
    } catch (error) {
      logger.error(
        {
          event: 'datahub_get_tags_failed',
          error: error instanceof Error ? error.message : String(error),
        },
        `Getting tags failed`,
      );
      throw error;
    }
  }

  async getStructuredProperties(urn: string): Promise<Record<string, any>> {
    logger.info(
      { event: 'datahub_get_structured_properties_start', urn },
      `Getting structured properties...`,
    );
    const start = performance.now();
    try {
      const result = await this.entities.getStructuredProperties(urn);
      const propCount = Object.keys(result).length;
      if (propCount === 0) {
        logger.info(
          {
            event: 'datahub_get_structured_properties_empty',
            durationMs: (performance.now() - start).toFixed(0),
          },
          `Structured properties unavailable, using empty object`,
        );
      } else {
        logger.info(
          {
            event: 'datahub_get_structured_properties_success',
            durationMs: (performance.now() - start).toFixed(0),
            count: propCount,
          },
          `Retrieved ${propCount} structured properties`,
        );
      }
      return result;
    } catch (error) {
      logger.error(
        {
          event: 'datahub_get_structured_properties_failed',
          error: error instanceof Error ? error.message : String(error),
        },
        `Getting structured properties failed`,
      );
      throw error;
    }
  }

  async getDomain(
    urn: string,
  ): Promise<{ urn: string; name: string; description?: string } | undefined> {
    logger.info(
      { event: 'datahub_get_domain_start', urn },
      `Getting domain...`,
    );
    const start = performance.now();
    try {
      const result = await this.entities.getDomain(urn);
      if (!result) {
        logger.info(
          {
            event: 'datahub_get_domain_empty',
            durationMs: (performance.now() - start).toFixed(0),
          },
          `Domain unavailable, using undefined`,
        );
      } else {
        logger.info(
          {
            event: 'datahub_get_domain_success',
            durationMs: (performance.now() - start).toFixed(0),
          },
          `Retrieved domain: ${result.name}`,
        );
      }
      return result;
    } catch (error) {
      logger.error(
        {
          event: 'datahub_get_domain_failed',
          error: error instanceof Error ? error.message : String(error),
        },
        `Getting domain failed`,
      );
      throw error;
    }
  }

  async getRelatedDashboards(
    urn: string,
  ): Promise<Array<{ urn: string; name: string; url?: string }>> {
    logger.info(
      { event: 'datahub_get_related_dashboards_start', urn },
      `Getting related dashboards...`,
    );
    const start = performance.now();
    try {
      const result = await this.entities.getRelatedDashboards(urn);
      if (result.length === 0) {
        logger.info(
          {
            event: 'datahub_get_related_dashboards_empty',
            durationMs: (performance.now() - start).toFixed(0),
          },
          `Related dashboards unavailable, using empty array`,
        );
      } else {
        logger.info(
          {
            event: 'datahub_get_related_dashboards_success',
            durationMs: (performance.now() - start).toFixed(0),
            count: result.length,
          },
          `Retrieved ${result.length} dashboards`,
        );
      }
      return result;
    } catch (error) {
      logger.error(
        {
          event: 'datahub_get_related_dashboards_failed',
          error: error instanceof Error ? error.message : String(error),
        },
        `Getting dashboards failed`,
      );
      throw error;
    }
  }

  async getRelatedPipelines(
    urn: string,
  ): Promise<Array<{ urn: string; name: string; platform: string }>> {
    logger.info(
      { event: 'datahub_get_related_pipelines_start', urn },
      `Getting related pipelines...`,
    );
    const start = performance.now();
    try {
      const result = await this.entities.getRelatedPipelines(urn);
      if (result.length === 0) {
        logger.info(
          {
            event: 'datahub_get_related_pipelines_empty',
            durationMs: (performance.now() - start).toFixed(0),
          },
          `Related pipelines unavailable, using empty array`,
        );
      } else {
        logger.info(
          {
            event: 'datahub_get_related_pipelines_success',
            durationMs: (performance.now() - start).toFixed(0),
            count: result.length,
          },
          `Retrieved ${result.length} pipelines`,
        );
      }
      return result;
    } catch (error) {
      logger.error(
        {
          event: 'datahub_get_related_pipelines_failed',
          error: error instanceof Error ? error.message : String(error),
        },
        `Getting pipelines failed`,
      );
      throw error;
    }
  }

  async getRelatedDbtModels(
    urn: string,
  ): Promise<Array<{ urn: string; name: string; package: string }>> {
    logger.info(
      { event: 'datahub_get_related_dbt_models_start', urn },
      `Getting related dbt models...`,
    );
    const start = performance.now();
    try {
      const result = await this.entities.getRelatedDbtModels(urn);
      if (result.length === 0) {
        logger.info(
          {
            event: 'datahub_get_related_dbt_models_empty',
            durationMs: (performance.now() - start).toFixed(0),
          },
          `Related dbt models unavailable, using empty array`,
        );
      } else {
        logger.info(
          {
            event: 'datahub_get_related_dbt_models_success',
            durationMs: (performance.now() - start).toFixed(0),
            count: result.length,
          },
          `Retrieved ${result.length} dbt models`,
        );
      }
      return result;
    } catch (error) {
      logger.error(
        {
          event: 'datahub_get_related_dbt_models_failed',
          error: error instanceof Error ? error.message : String(error),
        },
        `Getting dbt models failed`,
      );
      throw error;
    }
  }

  async getSchema(urn: string): Promise<SchemaField[]> {
    logger.info(
      { event: 'datahub_get_schema_start', urn },
      `Getting schema...`,
    );
    const start = performance.now();
    try {
      const result = await this.schema.getSchema(urn);
      logger.info(
        {
          event: 'datahub_get_schema_success',
          durationMs: (performance.now() - start).toFixed(0),
        },
        `Retrieved schema`,
      );
      return result.data;
    } catch (error) {
      logger.error(
        {
          event: 'datahub_get_schema_failed',
          error: error instanceof Error ? error.message : String(error),
        },
        `Getting schema failed`,
      );
      throw error;
    }
  }

  async getLineage(urn: string): Promise<Lineage> {
    logger.info(
      { event: 'datahub_get_lineage_start', urn },
      `Getting lineage...`,
    );
    const start = performance.now();
    try {
      const result = await this.lineage.getLineage(urn);
      logger.info(
        {
          event: 'datahub_get_lineage_success',
          durationMs: (performance.now() - start).toFixed(0),
        },
        `Retrieved lineage`,
      );
      return result.data;
    } catch (error) {
      logger.error(
        {
          event: 'datahub_get_lineage_failed',
          error: error instanceof Error ? error.message : String(error),
        },
        `Getting lineage failed`,
      );
      throw error;
    }
  }

  async getQueries(urn: string): Promise<DatasetQuery[]> {
    logger.info(
      { event: 'datahub_get_queries_start', urn },
      `Getting queries...`,
    );
    const start = performance.now();
    try {
      const result = await this.queries.getDatasetQueries(urn);
      logger.info(
        {
          event: 'datahub_get_queries_success',
          durationMs: (performance.now() - start).toFixed(0),
        },
        `Retrieved queries`,
      );
      return result.data;
    } catch (error) {
      logger.error(
        {
          event: 'datahub_get_queries_failed',
          error: error instanceof Error ? error.message : String(error),
        },
        `Getting queries failed`,
      );
      throw error;
    }
  }

  async searchDocumentation(query: string): Promise<Document[]> {
    logger.info(
      { event: 'datahub_search_documentation_start', query },
      `Searching documentation...`,
    );
    const start = performance.now();
    try {
      const result = await this.documents.searchDocuments(query);
      logger.info(
        {
          event: 'datahub_search_documentation_success',
          durationMs: (performance.now() - start).toFixed(0),
        },
        `Retrieved documentation`,
      );
      return result.data;
    } catch (error) {
      logger.warn(
        {
          event: 'datahub_search_documentation_failed',
          error: error instanceof Error ? error.message : String(error),
        },
        `Searching documentation failed, returning empty array`,
      );
      return [];
    }
  }

  async resolveDataset(query: string): Promise<Dataset | null> {
    logger.info(
      { event: 'datahub_resolve_dataset_start', query },
      `Resolving dataset: "${query}"...`,
    );
    const start = performance.now();
    try {
      const datasets = await this.searchDatasets(query, 1);
      if (datasets.length === 0) {
        logger.warn(
          { event: 'datahub_resolve_dataset_empty' },
          `No dataset found matching: "${query}"`,
        );
        return null;
      }
      const urn = datasets[0]?.urn;
      if (!urn) {
        logger.warn(
          { event: 'datahub_resolve_dataset_no_urn' },
          `Found dataset has no URN`,
        );
        return null;
      }
      const dataset = await this.getDataset(urn);
      logger.info(
        {
          event: 'datahub_resolve_dataset_success',
          durationMs: (performance.now() - start).toFixed(0),
        },
        `Dataset resolved`,
      );
      return dataset;
    } catch (error) {
      logger.error(
        {
          event: 'datahub_resolve_dataset_failed',
          error: error instanceof Error ? error.message : String(error),
        },
        `Resolving dataset failed`,
      );
      throw error;
    }
  }

  // ----------------------------------------------------------------
  // Write / Mutation methods
  // ----------------------------------------------------------------

  /**
   * Update the description of a dataset or a specific schema field.
   * mode: "overwrite" (default) | "append" | "remove"
   */
  async updateDescription(
    urn: string,
    description: string,
    fieldPath?: string,
    mode: 'overwrite' | 'append' | 'remove' = 'overwrite',
  ): Promise<UpdateDescriptionResponse> {
    const start = performance.now();
    try {
      // For dataset-level updates (no fieldPath), use update_description
      if (!fieldPath) {
        // Handle mode by getting current description and modifying it
        let finalDescription = description;
        if (mode === 'append') {
          try {
            const dataset = await this.getDataset(urn);
            const currentDescription = dataset.description || '';
            finalDescription = currentDescription + description;
          } catch {
            // If we can't get the current description, just use the new one
            logger.warn(
              { event: 'datahub_update_description_append_no_current', urn },
              `Could not fetch current description for append, using new description only`,
            );
          }
        } else if (mode === 'remove') {
          // Remove mode - remove the specified text from current description
          try {
            const dataset = await this.getDataset(urn);
            const currentDescription = dataset.description || '';
            finalDescription = currentDescription.replace(description, '');
          } catch {
            // If we can't get the current description, just set to empty
            logger.warn(
              { event: 'datahub_update_description_remove_no_current', urn },
              `Could not fetch current description for remove, setting to empty`,
            );
            finalDescription = '';
          }
        }
        // overwrite mode uses the description as-is

        const result = await this.mutations.updateDescription(
          urn,
          finalDescription,
          undefined,
        );
        logger.info(
          {
            event: 'datahub_update_description_success',
            urn,
            fieldPath,
            mode,
            durationMs: (performance.now() - start).toFixed(0),
          },
          `✏️ Description updated on ${urn}`,
        );
        return result;
      } else {
        // For field-level updates, use updateFieldDescription
        // Note: mode handling for fields would be similar but more complex
        // For now, we'll pass through to the mutation tool
        const result = await this.mutations.updateFieldDescription(
          urn,
          fieldPath,
          description,
        );
        logger.info(
          {
            event: 'datahub_update_description_success',
            urn,
            fieldPath,
            mode,
            durationMs: (performance.now() - start).toFixed(0),
          },
          `✏️ Description updated on ${urn}`,
        );
        return result;
      }
    } catch (error) {
      logger.error(
        {
          event: 'datahub_update_description_failed',
          urn,
          error: error instanceof Error ? error.message : String(error),
        },
        `Updating description failed`,
      );
      throw error;
    }
  }

  /**
   * Add tags to a dataset or column.
   * tags: array of tag URNs e.g. ["urn:li:tag:PII", "urn:li:tag:lineageguard_reviewed"]
   *
   */
  async addTags(
    urn: string,
    tags: string[],
    fieldPath?: string,
  ): Promise<MutationResult> {
    const start = performance.now();

    if (tags.length === 0) {
      return { success: true, message: 'No tags to add' };
    }

    // Check which tags are available in DataHub
    const availableTags: string[] = [];
    const unavailableTags: string[] = [];

    for (const tag of tags) {
      try {
        const exists = await this.tags.tagExists(tag);
        if (exists) {
          availableTags.push(tag);
        } else {
          unavailableTags.push(tag);
        }
      } catch {
        // If we can't check tag existence, assume it's unavailable
        unavailableTags.push(tag);
      }
    }

    // Log unavailable tags as a warning
    if (unavailableTags.length > 0) {
      logger.warn(
        {
          event: 'datahub_tags_unavailable',
          urn,
          unavailableTags,
          availableCount: availableTags.length,
        },
        `⚠️ ${unavailableTags.length} tag(s) not available in DataHub and will be skipped: ${unavailableTags.join(', ')}`,
      );
    }

    // If no tags are available, skip the operation
    if (availableTags.length === 0) {
      logger.warn(
        {
          event: 'datahub_add_tags_skipped',
          urn,
          reason: 'no_available_tags',
        },
        `⚠️ No available tags to add for ${urn}`,
      );
      return { success: true, message: 'No available tags to add' };
    }

    // Add only the available tags
    try {
      const result = await this.mutations.addTags(urn, availableTags, fieldPath);

      logger.info(
        {
          event: 'datahub_add_tags_success',
          urn,
          tags: availableTags,
          skippedTags: unavailableTags,
          fieldPath,
          durationMs: (performance.now() - start).toFixed(0),
        },
        `🏷️ Added ${availableTags.length} available tags to ${urn}${unavailableTags.length > 0 ? ` (skipped ${unavailableTags.length} unavailable)` : ''}`,
      );

      return result;
    } catch (error) {
      // Don't log tag addition failures as errors - they're optional
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn(
        {
          event: 'datahub_add_tags_failed',
          urn,
          tags: availableTags,
          error: errorMessage,
        },
        `⚠️ Failed to add tags to ${urn}, but continuing (tags are optional)`,
      );

      // Return success anyway since tags are optional
      return { success: true, message: 'Tag addition failed but continuing (tags are optional)' };
    }
  }

  /**
   * Remove tags from a dataset or column.
   * tags: array of tag URNs e.g. ["urn:li:tag:PII", "urn:li:tag:lineageguard_reviewed"]
   */
  async removeTags(
    urn: string,
    tags: string[],
    fieldPath?: string,
  ): Promise<MutationResult> {
    const start = performance.now();
    try {
      const result = await this.mutations.removeTags(urn, tags, fieldPath);
      logger.info(
        {
          event: 'datahub_remove_tags_success',
          urn,
          tags,
          fieldPath,
          durationMs: (performance.now() - start).toFixed(0),
        },
        `🏷️ Tags removed from ${urn}`,
      );
      return result;
    } catch (error) {
      logger.error(
        {
          event: 'datahub_remove_tags_failed',
          urn,
          error: error instanceof Error ? error.message : String(error),
        },
        `Removing tags failed`,
      );
      throw error;
    }
  }

  /**
   * Add glossary terms to a dataset or column.
   * terms: array of glossary term URNs e.g. ["urn:li:glossaryTerm:Revenue"]
   */
  async addTerms(
    urn: string,
    terms: string[],
    fieldPath?: string,
  ): Promise<MutationResult> {
    const start = performance.now();
    try {
      const result = await this.mutations.addTerms(urn, terms, fieldPath);
      logger.info(
        {
          event: 'datahub_add_terms_success',
          urn,
          terms,
          fieldPath,
          durationMs: (performance.now() - start).toFixed(0),
        },
        `📖 Glossary terms added to ${urn}`,
      );
      return result;
    } catch (error) {
      logger.error(
        {
          event: 'datahub_add_terms_failed',
          urn,
          error: error instanceof Error ? error.message : String(error),
        },
        `Adding glossary terms failed`,
      );
      throw error;
    }
  }

  /**
   * Add owners to a dataset.
   * owners: array of { owner_urn, ownership_type? }
   * ownership_type: "TECHNICAL_OWNER" | "BUSINESS_OWNER" | "DATA_STEWARD" | "NONE"
   */
  async addOwners(
    urn: string,
    owners: Array<{ owner_urn: string; ownership_type?: string }>,
  ): Promise<MutationResult> {
    const start = performance.now();
    try {
      const result = await this.mutations.addOwners(urn, owners);
      logger.info(
        {
          event: 'datahub_add_owners_success',
          urn,
          count: owners.length,
          durationMs: (performance.now() - start).toFixed(0),
        },
        `👤 ${owners.length} owner(s) added to ${urn}`,
      );
      return result;
    } catch (error) {
      logger.error(
        {
          event: 'datahub_add_owners_failed',
          urn,
          error: error instanceof Error ? error.message : String(error),
        },
        `Adding owners failed`,
      );
      throw error;
    }
  }

  /**
   * Assign a domain to a dataset.
   * domainUrn: e.g. "urn:li:domain:engineering"
   */
  async setDomain(urn: string, domainUrn: string): Promise<MutationResult> {
    const start = performance.now();
    try {
      const result = await this.mutations.setDomain(urn, domainUrn);
      logger.info(
        {
          event: 'datahub_set_domain_success',
          urn,
          domainUrn,
          durationMs: (performance.now() - start).toFixed(0),
        },
        `🗂️ Domain set on ${urn}`,
      );
      return result;
    } catch (error) {
      logger.error(
        {
          event: 'datahub_set_domain_failed',
          urn,
          error: error instanceof Error ? error.message : String(error),
        },
        `Setting domain failed`,
      );
      throw error;
    }
  }

  /**
   * Write structured (typed) properties onto a dataset.
   * properties: map of property URN → value(s) (each value must be wrapped in an array)
   */
  async addStructuredProperties(
    urn: string,
    properties: Record<string, unknown[]>,
  ): Promise<MutationResult> {
    const start = performance.now();
    try {
      const result = await this.mutations.addStructuredProperties(
        urn,
        properties,
      );
      logger.info(
        {
          event: 'datahub_add_structured_props_success',
          urn,
          keys: Object.keys(properties),
          durationMs: (performance.now() - start).toFixed(0),
        },
        `🗃️ Structured properties written to ${urn}`,
      );
      return result;
    } catch (error) {
      logger.error(
        {
          event: 'datahub_add_structured_props_failed',
          urn,
          error: error instanceof Error ? error.message : String(error),
        },
        `Writing structured properties failed`,
      );
      throw error;
    }
  }
}
