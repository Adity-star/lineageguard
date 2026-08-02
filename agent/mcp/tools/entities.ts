import { z } from "zod";

import { MCPClient } from "../client.js";
import { logger } from "../../config/logger.js";

import {
  Dataset,
  DatasetSchema,
  MCPToolResponse,
} from "../types.js";

const EntityResponseSchema = DatasetSchema;

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

  public async getDataset(
      urn: string
  ): Promise<Dataset> {
      try {
          logger.info({
              event: "entity_tool_get_dataset_start",
              urn,
          }, `EntityTool.getDataset() calling MCP tool for URN: ${urn}`);

          const result = await this.client.executeTool<Dataset>(
              "get_dataset",
              { urn },
              DatasetSchema
          );

          logger.info({
              event: "entity_tool_get_dataset_success",
              urn,
              datasetName: result.data.name,
              durationMs: result.durationMs,
          }, `EntityTool.getDataset() succeeded: ${result.data.name} (${result.durationMs}ms)`);

          return result.data;
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorType = error instanceof Error ? error.constructor.name : typeof error;

          logger.error({
              event: "entity_tool_get_dataset_failed",
              urn,
              error: errorMessage,
              errorType,
              stack: error instanceof Error ? error.stack : undefined,
          }, `EntityTool.getDataset() failed for URN ${urn}: ${errorMessage}`);

          throw error;
      }
  }

  private async callToolDirect(toolName: string, args: Record<string, unknown>): Promise<any> {
      // Fallback direct call if needed (not recommended)
      const client = (this.client as any)["transport"]?.getClient();
      if (!client) {
          throw new Error("Transport client not available");
      }
      const response: any = await client.callTool({
          name: toolName,
          arguments: args
      });
      return response;
  }

  public async getOwners(
    urn: string
  ): Promise<Array<{ urn: string; name: string; type: string }>> {
    try {
      const raw = await this.client.executeTool<any>(
        "get_owners",
        { urn },
        z.array(OwnerSchema)
      );
      return raw.data;
    } catch (error) {
      // Fallback to empty array if tool not available
      return [];
    }
  }

  public async getGlossaryTerms(
    urn: string
  ): Promise<Array<{ urn: string; name: string; description?: string }>> {
    try {
      const raw = await this.client.executeTool<any>(
        "get_glossary_terms",
        { urn },
        z.array(GlossaryTermSchema)
      );
      return raw.data;
    } catch (error) {
      return [];
    }
  }

  public async getTags(
    urn: string
  ): Promise<string[]> {
    try {
      const raw = await this.client.executeTool<any>(
        "get_tags",
        { urn },
        z.array(TagSchema)
      );
      return raw.data.map((t: any) => t.name);
    } catch (error) {
      return [];
    }
  }

  public async getStructuredProperties(
    urn: string
  ): Promise<Record<string, any>> {
    try {
      const raw = await this.client.executeTool<any>(
        "get_structured_properties",
        { urn },
        z.object({ properties: z.record(z.string(), z.any()) })
      );
      return raw.data.properties || {};
    } catch (error) {
      return {};
    }
  }

  public async getDomain(
    urn: string
  ): Promise<{ urn: string; name: string; description?: string } | undefined> {
    try {
      const raw = await this.client.executeTool<any>(
        "get_domain",
        { urn },
        DomainSchema
      );
      return raw.data;
    } catch (error) {
      return undefined;
    }
  }

  public async getRelatedDashboards(
    urn: string
  ): Promise<Array<{ urn: string; name: string; url?: string }>> {
    try {
      const raw = await this.client.executeTool<any>(
        "get_related_dashboards",
        { urn },
        z.array(DashboardSchema)
      );
      return raw.data;
    } catch (error) {
      return [];
    }
  }

  public async getRelatedPipelines(
    urn: string
  ): Promise<Array<{ urn: string; name: string; platform: string }>> {
    try {
      const raw = await this.client.executeTool<any>(
        "get_related_pipelines",
        { urn },
        z.array(PipelineSchema)
      );
      return raw.data;
    } catch (error) {
      return [];
    }
  }

  public async getRelatedDbtModels(
    urn: string
  ): Promise<Array<{ urn: string; name: string; package: string }>> {
    try {
      const raw = await this.client.executeTool<any>(
        "get_related_dbt_models",
        { urn },
        z.array(DbtModelSchema)
      );
      return raw.data;
    } catch (error) {
      return [];
    }
  }

  public async searchDatasets(
    query: string,
    limit: number = 5
  ): Promise<Dataset[]> {
    const raw = await this.client.executeTool<any>(
      "search_datasets",
      { query, limit },
      z.array(EntityResponseSchema)
    );
    return raw.data;
  }

  public async getDatasets(
    urns: string[]
  ): Promise<MCPToolResponse<Dataset[]>> {
    const start = performance.now();

    const raw = await this.client.executeTool<any>(
      "get_entities",
      {
        urns,
      },
      z.array(EntityResponseSchema)
    );

    return {
      tool: "get_entities",
      durationMs: performance.now() - start,
      data: raw.data,
    };
  }
}