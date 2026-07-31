import { z } from "zod";

import { MCPClient } from "../client";

import {
  LineageSchema,
  Lineage,
  MCPToolResponse,
} from "../types";

export class LineageTool {
  constructor(
    private readonly client: MCPClient
  ) {}

  async getLineage(
    urn: string
  ): Promise<MCPToolResponse<Lineage>> {
    return this.client.executeTool(
      "get_lineage",
      {
        urn,
      },
      LineageSchema
    );
  }

  async getUpstream(
    urn: string
  ): Promise<MCPToolResponse<Lineage>> {
    return this.client.executeTool(
      "get_lineage",
      {
        urn,
        direction: "upstream",
      },
      LineageSchema
    );
  }

  async getDownstream(
    urn: string
  ): Promise<MCPToolResponse<Lineage>> {
    return this.client.executeTool(
      "get_lineage",
      {
        urn,
        direction: "downstream",
      },
      LineageSchema
    );
  }
}