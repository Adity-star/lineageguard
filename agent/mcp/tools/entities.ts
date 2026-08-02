import { z } from "zod";

import { MCPClient } from "../client.js";

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

      const client = (this.client as any)["transport"].getClient();

      const response:any = await client.callTool({
          name:"get_dataset",
          arguments:{ urn }
      });

      const raw = response.structuredContent;

      const dataset = Array.isArray(raw)
          ? raw[0]
          : raw;

      return DatasetSchema.parse(dataset);
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