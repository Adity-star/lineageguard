import { z } from "zod";

import { MCPClient } from "../client";
import {
  MCPToolResponse,
  SearchResult,
  SearchResultSchema,
} from "../types";

const SearchResponseSchema = z.array(SearchResultSchema);

export interface SearchOptions {
  query: string;
  entityTypes?: string[];
  limit?: number;
}

export class SearchTool {
  constructor(private readonly client: MCPClient) {}

  public async searchDatasets(
    query: string,
    limit = 10
  ): Promise<MCPToolResponse<SearchResult[]>> {
    const start = performance.now();

    const raw = await this.client.callTool<any>(
      "search",
      {
        query,
        entityTypes: ["dataset"],
        limit,
      }
    );

    const parsed = SearchResponseSchema.parse(
      raw.content ?? raw
    );

    return {
      tool: "search",
      durationMs: performance.now() - start,
      data: parsed,
    };
  }

  public async searchEntities(
    options: SearchOptions
  ): Promise<MCPToolResponse<SearchResult[]>> {
    const start = performance.now();

    const raw = await this.client.callTool<any>(
      "search",
      {
        query: options.query,
        entityTypes: options.entityTypes,
        limit: options.limit ?? 10,
      }
    );

    const parsed = SearchResponseSchema.parse(
      raw.content ?? raw
    );

    return {
      tool: "search",
      durationMs: performance.now() - start,
      data: parsed,
    };
  }
}