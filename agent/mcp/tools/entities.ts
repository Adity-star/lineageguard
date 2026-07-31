import { z } from "zod";

import { MCPClient } from "../client";

import {
  Dataset,
  DatasetSchema,
  MCPToolResponse,
} from "../types";

const EntityResponseSchema = DatasetSchema;

export class EntityTool {
  constructor(
    private readonly client: MCPClient
  ) {}

  public async getDataset(
    urn: string
  ): Promise<MCPToolResponse<Dataset>> {
    const start = performance.now();

    const raw = await this.client.callTool<any>(
      "get_entities",
      {
        urns: [urn],
      }
    );

    const entity =
      raw.entities?.[0] ??
      raw.content?.entities?.[0] ??
      raw;

    const parsed =
      EntityResponseSchema.parse(entity);

    return {
      tool: "get_entities",
      durationMs: performance.now() - start,
      data: parsed,
    };
  }

  public async getDatasets(
    urns: string[]
  ): Promise<MCPToolResponse<Dataset[]>> {
    const start = performance.now();

    const raw = await this.client.callTool<any>(
      "get_entities",
      {
        urns,
      }
    );

    const entities =
      raw.entities ??
      raw.content?.entities ??
      [];

    const parsed = z
      .array(DatasetSchema)
      .parse(entities);

    return {
      tool: "get_entities",
      durationMs: performance.now() - start,
      data: parsed,
    };
  }
}