import { z } from "zod";

import { MCPClient } from "../client.js";

import {
  Dataset,
  DatasetSchema,
  MCPToolResponse,
} from "../types.js";

const EntityResponseSchema = DatasetSchema;

export class EntityTool {
  constructor(
    private readonly client: MCPClient
  ) {}

  public async getDataset(
    urn: string
  ): Promise<Dataset> {
    const raw = await this.client.executeTool<any>(
      "get_dataset",
      { urn },
      EntityResponseSchema
    );
    return raw.data;
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