import { z } from "zod";

import { MCPClient } from "../client";
import {
  DatasetQuerySchema,
  DatasetQuery,
  MCPToolResponse,
} from "../types";

const DatasetQueriesSchema = z.array(DatasetQuerySchema);

export class QueryTool {
  constructor(
    private readonly client: MCPClient
  ) {}

  /**
   * Returns SQL queries that reference a dataset.
   */
  async getDatasetQueries(
    urn: string
  ): Promise<MCPToolResponse<DatasetQuery[]>> {
    return this.client.executeTool(
      "get_dataset_queries",
      {
        urn,
      },
      DatasetQueriesSchema
    );
  }

  /**
   * Search query history for a keyword.
   */
  async searchQueries(
    keyword: string
  ): Promise<MCPToolResponse<DatasetQuery[]>> {
    return this.client.executeTool(
      "get_dataset_queries",
      {
        keyword,
      },
      DatasetQueriesSchema
    );
  }
}