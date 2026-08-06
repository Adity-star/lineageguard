import { z } from "zod";

import { MCPClient } from "../client.js";
import { logger } from "../../config/logger.js";

import {
  Dataset,
  DatasetSchema,
  MCPToolResponse,
} from "../types.js";

const OwnerSchema = z.object({
  urn: z.string(),
  name: z.string(),
  type: z.string(),
});

const GlossaryTermSchema = z.object({
  urn: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

const TagSchema = z.object({
  name: z.string(),
});

const DomainSchema = z.object({
  urn: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

const DashboardSchema = z.object({
  urn: z.string(),
  name: z.string(),
  url: z.string().optional(),
});

const PipelineSchema = z.object({
  urn: z.string(),
  name: z.string(),
  platform: z.string(),
});

const DbtModelSchema = z.object({
  urn: z.string(),
  name: z.string(),
  package: z.string(),
});

export class EntityTool {
  constructor(
    private readonly client: MCPClient
  ) {}

  /**
   * Get a single dataset by URN using get_entities.
   * 
   * The MCP server's get_entities tool returns a collection of entities.
   * We extract the first (and should be only) result and map it to our Dataset schema.
   */
  public async getDataset(
      urn: string
  ): Promise<Dataset> {
      try {
          logger.info({
              event: "entity_tool_get_dataset_start",
              urn,
              toolName: "get_entities",
          }, `Retrieving dataset by URN: ${urn}`);

          // Call get_entities with URN array
          const response = await this.client.executeTool<any>(
              "get_entities",
              { urns: [urn] },  // get_entities expects array of URNs
              z.any()
          );

          logger.debug({
              event: "entity_tool_get_entities_response",
              urn,
              responseType: Array.isArray(response.data) ? "array" : typeof response.data,
              responseLength: Array.isArray(response.data) ? response.data.length : 0,
              hasData: !!response.data,
          }, `get_entities response received`);

          // Extract the first entity from the response
          let entity: any;
          if (Array.isArray(response.data) && response.data.length > 0) {
              entity = response.data[0];
          } else if (response.data && typeof response.data === "object" && !Array.isArray(response.data)) {
              entity = response.data;
          }

          // Validate we got an entity - CRITICAL: fail if undefined
          if (!entity) {
              const error = `No entity returned from get_entities for URN: ${urn}`;
              logger.error({
                  event: "entity_tool_get_dataset_not_found",
                  urn,
                  responseType: typeof response.data,
              }, error);
              throw new Error(error);
          }

          logger.debug({
              event: "entity_tool_entity_extracted",
              urn,
              entityKeys: Object.keys(entity).slice(0, 10), // Log first 10 keys
              hasUrn: !!entity.urn,
              hasName: !!entity.name,
          }, `Entity extracted from response`);

          // Map DataHub entity to internal Dataset schema
          const dataset = this.mapEntityToDataset(entity, urn);

          // Validate the mapped dataset has required fields - CRITICAL: fail if invalid
          if (!dataset || !dataset.urn) {
              logger.error({
                  event: "entity_tool_dataset_mapping_failed",
                  urn,
                  mappedUrn: dataset?.urn,
                  mappedName: dataset?.name,
                  mappedPlatform: dataset?.platform,
              }, `Mapped dataset is invalid or missing URN`);
              throw new Error(`Mapped dataset is invalid or missing URN`);
          }

          // Validate against schema
          const validatedDataset = DatasetSchema.parse(dataset);

          logger.info({
              event: "entity_tool_get_dataset_success",
              urn,
              datasetName: validatedDataset.name,
              datasetPlatform: validatedDataset.platform,
              tagsCount: validatedDataset.tags?.length || 0,
              ownersCount: validatedDataset.owners?.length || 0,
          }, `Dataset retrieved: ${validatedDataset.name}`);

          return validatedDataset;
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorType = error instanceof Error ? error.constructor.name : typeof error;

          logger.error({
              event: "entity_tool_get_dataset_failed",
              urn,
              toolName: "get_entities",
              errorType,
          }, `Failed to retrieve dataset: ${errorMessage}`);

          throw error;
      }
  }

  /**
   * Map a DataHub entity to our internal Dataset schema.
   * 
   * Handles multiple DataHub entity formats and normalizes to our schema.
   * Falls back to provided URN if entity doesn't contain it.
   */
  private mapEntityToDataset(entity: any, providedUrn?: string): Dataset {
      // Extract URN - try multiple field paths
      let urn = entity.urn || entity.id || providedUrn;
      
      // If entity has nested structure, try to extract from there
      if (!urn && entity.entity) {
          urn = entity.entity.urn || entity.entity.id;
      }
      
      // Extract name - try multiple field paths
      let name = entity.name || entity.title || entity.displayName;
      
      // Handle nested structure
      if (!name && entity.entity) {
          name = entity.entity.name || entity.entity.title || entity.entity.displayName;
      }
      
      // Default name if still missing
      if (!name) {
          // Try to extract from URN as last resort
          if (urn) {
              const parts = urn.split(",");
              if (parts.length > 0) {
                  name = parts[parts.length - 1].split(")")[0].trim();
              }
          }
          if (!name) {
              name = "Unknown Dataset";
          }
      }

      // Extract platform
      let platform = entity.platform || entity.source;
      
      // Handle nested structure
      if (!platform && entity.entity) {
          platform = entity.entity.platform || entity.entity.source;
      }
      
      // Extract from URN if available (URN format: urn:li:dataset:(urn:li:dataPlatform:<platform>,...))
      if (!platform && urn) {
          const platformMatch = urn.match(/dataPlatform:(\w+)/);
          if (platformMatch) {
              platform = platformMatch[1];
          }
      }
      
      if (!platform) {
          platform = "unknown";
      }

      // Extract description
      let description = entity.description;
      
      // Handle nested structure
      if (!description && entity.entity) {
          description = entity.entity.description;
      }
      
      // Handle docs array
      if (!description && entity.docs && Array.isArray(entity.docs) && entity.docs.length > 0) {
          description = entity.docs[0].description;
      }
      
      description = description || "";

      // Extract owners, tags, and glossary terms
      const owners = this.extractOwners(entity);
      const tags = this.extractTags(entity);
      const glossaryTerms = this.extractGlossaryTerms(entity);

      // Map to internal Dataset schema
      const dataset: Dataset = {
          urn,
          name,
          platform,
          description,
          owners: owners.length > 0 ? owners : undefined,
          tags: tags.length > 0 ? tags : undefined,
          glossaryTerms: glossaryTerms.length > 0 ? glossaryTerms : undefined,
      };

      logger.debug({
          event: "entity_mapped_to_dataset",
          urn: dataset.urn ? "present" : "missing",
          name: dataset.name,
          platform: dataset.platform,
          ownerCount: owners.length,
          tagCount: tags.length,
      }, `Entity mapped to dataset`);

      return dataset;
  }

  /**
   * Extract owners from DataHub entity.
   */
  private extractOwners(entity: any): Array<{ urn: string; name: string; type: string }> {
      const owners: Array<{ urn: string; name: string; type: string }> = [];

      if (entity.owners && Array.isArray(entity.owners)) {
          for (const owner of entity.owners) {
              owners.push({
                  urn: owner.urn || owner.id,
                  name: owner.name || owner.username || "",
                  type: owner.type || owner.ownershipType || "TECHNICAL_OWNER",
              });
          }
      }

      return owners;
  }

  /**
   * Extract tags from DataHub entity.
   */
  private extractTags(entity: any): string[] {
      const tags: string[] = [];

      if (entity.tags && Array.isArray(entity.tags)) {
          for (const tag of entity.tags) {
              const tagName = typeof tag === "string" ? tag : (tag.name || tag.urn || "");
              if (tagName) {
                  tags.push(tagName);
              }
          }
      }

      return tags;
  }

  /**
   * Extract glossary terms from DataHub entity.
   */
  private extractGlossaryTerms(entity: any): Array<{ urn: string; name: string; description?: string }> {
      const terms: Array<{ urn: string; name: string; description?: string }> = [];

      if (entity.glossaryTerms && Array.isArray(entity.glossaryTerms)) {
          for (const term of entity.glossaryTerms) {
              terms.push({
                  urn: term.urn || term.id,
                  name: term.name || "",
                  description: term.description,
              });
          }
      }

      return terms;
  }

  public async searchDatasets(
    query: string,
    limit: number = 5
  ): Promise<Dataset[]> {
    try {
      logger.info({
        event: "entity_tool_search_datasets_start",
        query,
        limit,
        toolName: "search",
      }, `Searching for datasets: "${query}"`);

      const raw = await this.client.executeTool<any>(
        "search",
        { query, limit },
        z.any()
      );

      logger.debug({
        event: "entity_tool_search_response",
        query,
        resultCount: Array.isArray(raw.data) ? raw.data.length : 0,
        responseType: Array.isArray(raw.data) ? "array" : typeof raw.data,
      }, `Search response received`);

      // Validate we got results
      if (!raw.data) {
        return [];
      }

      // If results is an array, process each
      if (Array.isArray(raw.data)) {
        return raw.data.map((item, idx) => {
          const mapped = this.mapEntityToDataset(item);
          logger.debug({
            event: "entity_tool_search_result_mapped",
            index: idx,
            name: mapped.name,
            platform: mapped.platform,
          }, `Search result ${idx} mapped`);
          return mapped;
        });
      }

      return [];
    } catch (error) {
      logger.error({
        event: "entity_tool_search_failed",
        query,
        toolName: "search",
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      }, `Search failed: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  public async getDatasets(
    urns: string[]
  ): Promise<MCPToolResponse<Dataset[]>> {
    const start = performance.now();

    try {
      logger.info({
        event: "entity_tool_get_datasets_start",
        urnCount: urns.length,
        toolName: "get_entities",
      }, `Retrieving ${urns.length} dataset(s)`);

      const raw = await this.client.executeTool<any>(
        "get_entities",
        { urns },
        z.any()
      );

      logger.debug({
        event: "entity_tool_get_entities_response",
        urnCount: urns.length,
        resultCount: Array.isArray(raw.data) ? raw.data.length : 0,
        responseType: Array.isArray(raw.data) ? "array" : typeof raw.data,
      }, `get_entities response received`);

      // Validate we got results
      if (!raw.data) {
        return {
          tool: "get_entities",
          durationMs: performance.now() - start,
          data: [],
        };
      }

      // If results is an array, map each entity to Dataset
      const datasets = Array.isArray(raw.data)
        ? raw.data.map((item, idx) => {
            const mapped = this.mapEntityToDataset(item, urns[idx]);
            logger.debug({
              event: "entity_tool_get_dataset_result_mapped",
              index: idx,
              name: mapped.name,
              platform: mapped.platform,
            }, `Dataset ${idx} mapped`);
            return mapped;
          })
        : [];

      return {
        tool: "get_entities",
        durationMs: performance.now() - start,
        data: datasets,
      };
    } catch (error) {
      logger.error({
        event: "entity_tool_get_entities_failed",
        urnCount: urns.length,
        toolName: "get_entities",
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      }, `Failed to get entities: ${error instanceof Error ? error.message : String(error)}`);

      return {
        tool: "get_entities",
        durationMs: performance.now() - start,
        data: [],
      };
    }
  }

  public async getOwners(
    urn: string
  ): Promise<Array<{ urn: string; name: string; type: string }>> {
    try {
      logger.info({
        event: "entity_tool_get_owners_start",
        urn,
        toolName: "get_owners",
      }, `Retrieving owners for: ${urn}`);

      const raw = await this.client.executeTool<any>(
        "get_owners",
        { urn },
        z.any()
      );

      const resultCount = Array.isArray(raw.data) ? raw.data.length : 0;
      logger.debug({
        event: "entity_tool_get_owners_response",
        urn,
        ownerCount: resultCount,
      }, `get_owners response received`);

      return raw.data || [];
    } catch (error) {
      logger.warn({
        event: "entity_tool_get_owners_failed",
        urn,
        toolName: "get_owners",
      }, `get_owners not available`);
      return [];
    }
  }

  public async getGlossaryTerms(
    urn: string
  ): Promise<Array<{ urn: string; name: string; description?: string }>> {
    try {
      logger.info({
        event: "entity_tool_get_glossary_terms_start",
        urn,
        toolName: "get_glossary_terms",
      }, `Retrieving glossary terms for: ${urn}`);

      const raw = await this.client.executeTool<any>(
        "get_glossary_terms",
        { urn },
        z.any()
      );

      const resultCount = Array.isArray(raw.data) ? raw.data.length : 0;
      logger.debug({
        event: "entity_tool_get_glossary_terms_response",
        urn,
        termCount: resultCount,
      }, `get_glossary_terms response received`);

      return raw.data || [];
    } catch (error) {
      logger.warn({
        event: "entity_tool_get_glossary_terms_failed",
        urn,
        toolName: "get_glossary_terms",
      }, `get_glossary_terms not available`);
      return [];
    }
  }

  public async getTags(
    urn: string
  ): Promise<string[]> {
    try {
      logger.info({
        event: "entity_tool_get_tags_start",
        urn,
        toolName: "get_tags",
      }, `Retrieving tags for: ${urn}`);

      const raw = await this.client.executeTool<any>(
        "get_tags",
        { urn },
        z.any()
      );

      const resultCount = Array.isArray(raw.data) ? raw.data.length : 0;
      logger.debug({
        event: "entity_tool_get_tags_response",
        urn,
        tagCount: resultCount,
      }, `get_tags response received`);

      return raw.data || [];
    } catch (error) {
      logger.warn({
        event: "entity_tool_get_tags_failed",
        urn,
        toolName: "get_tags",
      }, `get_tags not available`);
      return [];
    }
  }

  public async getStructuredProperties(
    urn: string
  ): Promise<Record<string, any>> {
    try {
      logger.info({
        event: "entity_tool_get_structured_properties_start",
        urn,
        toolName: "get_structured_properties",
      }, `Retrieving structured properties for: ${urn}`);

      const raw = await this.client.executeTool<any>(
        "get_structured_properties",
        { urn },
        z.any()
      );

      const propCount = raw.data ? Object.keys(raw.data).length : 0;
      logger.debug({
        event: "entity_tool_get_structured_properties_response",
        urn,
        propertyCount: propCount,
      }, `get_structured_properties response received`);

      return raw.data || {};
    } catch (error) {
      logger.warn({
        event: "entity_tool_get_structured_properties_failed",
        urn,
        toolName: "get_structured_properties",
      }, `get_structured_properties not available`);
      return {};
    }
  }

  public async getDomain(
    urn: string
  ): Promise<{ urn: string; name: string; description?: string } | undefined> {
    try {
      logger.info({
        event: "entity_tool_get_domain_start",
        urn,
        toolName: "get_domain",
      }, `Retrieving domain for: ${urn}`);

      const raw = await this.client.executeTool<any>(
        "get_domain",
        { urn },
        z.any()
      );

      logger.debug({
        event: "entity_tool_get_domain_response",
        urn,
        hasDomain: !!raw.data,
      }, `get_domain response received`);

      return raw.data || undefined;
    } catch (error) {
      logger.warn({
        event: "entity_tool_get_domain_failed",
        urn,
        toolName: "get_domain",
      }, `get_domain not available`);
      return undefined;
    }
  }

  public async getRelatedDashboards(
    urn: string
  ): Promise<Array<{ urn: string; name: string; url?: string }>> {
    try {
      logger.info({
        event: "entity_tool_get_related_dashboards_start",
        urn,
        toolName: "get_related_dashboards",
      }, `Retrieving related dashboards for: ${urn}`);

      const raw = await this.client.executeTool<any>(
        "get_related_dashboards",
        { urn },
        z.any()
      );

      const resultCount = Array.isArray(raw.data) ? raw.data.length : 0;
      logger.debug({
        event: "entity_tool_get_related_dashboards_response",
        urn,
        dashboardCount: resultCount,
      }, `get_related_dashboards response received`);

      return raw.data || [];
    } catch (error) {
      logger.warn({
        event: "entity_tool_get_related_dashboards_failed",
        urn,
        toolName: "get_related_dashboards",
      }, `get_related_dashboards not available`);
      return [];
    }
  }

  public async getRelatedPipelines(
    urn: string
  ): Promise<Array<{ urn: string; name: string; platform: string }>> {
    try {
      logger.info({
        event: "entity_tool_get_related_pipelines_start",
        urn,
        toolName: "get_related_pipelines",
      }, `Retrieving related pipelines for: ${urn}`);

      const raw = await this.client.executeTool<any>(
        "get_related_pipelines",
        { urn },
        z.any()
      );

      const resultCount = Array.isArray(raw.data) ? raw.data.length : 0;
      logger.debug({
        event: "entity_tool_get_related_pipelines_response",
        urn,
        pipelineCount: resultCount,
      }, `get_related_pipelines response received`);

      return raw.data || [];
    } catch (error) {
      logger.warn({
        event: "entity_tool_get_related_pipelines_failed",
        urn,
        toolName: "get_related_pipelines",
      }, `get_related_pipelines not available`);
      return [];
    }
  }

  public async getRelatedDbtModels(
    urn: string
  ): Promise<Array<{ urn: string; name: string; package: string }>> {
    try {
      logger.info({
        event: "entity_tool_get_related_dbt_models_start",
        urn,
        toolName: "get_related_dbt_models",
      }, `Retrieving related dbt models for: ${urn}`);

      const raw = await this.client.executeTool<any>(
        "get_related_dbt_models",
        { urn },
        z.any()
      );

      const resultCount = Array.isArray(raw.data) ? raw.data.length : 0;
      logger.debug({
        event: "entity_tool_get_related_dbt_models_response",
        urn,
        dbtModelCount: resultCount,
      }, `get_related_dbt_models response received`);

      return raw.data || [];
    } catch (error) {
      logger.warn({
        event: "entity_tool_get_related_dbt_models_failed",
        urn,
        toolName: "get_related_dbt_models",
      }, `get_related_dbt_models not available`);
      return [];
    }
  }
}
