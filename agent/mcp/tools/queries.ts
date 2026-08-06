import { z } from "zod";
import { logger } from "../../config/logger.js";
import { MCPClient } from "../client.js";
import { MCPResponseUnwrapper } from "./mcp-response-unwrapper.js";
import {
  DatasetQuerySchema,
  DatasetQuery,
  MCPToolResponse,
} from "../types.js";


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
    const toolName = "get_dataset_queries";
    const startTime = performance.now();

    try {
      logger.debug(
        {
          event: "query_retrieval_start",
          toolName,
          urn,
        },
        `Retrieving queries for ${urn}`
      );

      // Execute raw to get unwrapped response
      const rawResponse = await this.client.executeToolRaw(toolName, { urn });

      // Unwrap MCP content wrapper and extract array
      const unwrapped = MCPResponseUnwrapper.unwrapArray(rawResponse, toolName, "queries");

      // Map each query to internal format
      const mappedQueries = unwrapped.map((rawQuery: any, index: number) => {
        try {
          return this.mapQuery(rawQuery);
        } catch (error) {
          logger.warn(
            {
              event: "query_mapping_failed",
              toolName,
              index,
              error: error instanceof Error ? error.message : String(error),
            },
            `Failed to map query at index ${index} - skipping`
          );
          return null;
        }
      }).filter((q): q is DatasetQuery => q !== null);

      const durationMs = performance.now() - startTime;

      logger.debug(
        {
          event: "query_retrieval_success",
          toolName,
          urn,
          queryCount: mappedQueries.length,
          durationMs: Math.round(durationMs),
        },
        `Retrieved ${mappedQueries.length} queries`
      );

      return {
        tool: toolName,
        durationMs,
        data: mappedQueries,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = performance.now() - startTime;

      logger.error(
        {
          event: "query_retrieval_failed",
          toolName,
          urn,
          error: errorMessage,
          durationMs: Math.round(durationMs),
        },
        `Failed to retrieve queries: ${errorMessage}`
      );

      throw new Error(
        `Query retrieval failed for ${urn}: ${errorMessage}`
      );
    }
  }

  /**
   * Search query history for a keyword.
   */
  async searchQueries(
    keyword: string
  ): Promise<MCPToolResponse<DatasetQuery[]>> {
    const toolName = "search_queries";
    const startTime = performance.now();

    try {
      logger.debug(
        {
          event: "query_search_start",
          toolName,
          keyword,
        },
        `Searching queries for keyword: ${keyword}`
      );

      // Execute raw to get unwrapped response
      const rawResponse = await this.client.executeToolRaw(toolName, { keyword });

      // Unwrap MCP content wrapper and extract array
      const unwrapped = MCPResponseUnwrapper.unwrapArray(rawResponse, toolName, "queries");

      // Map each query to internal format
      const mappedQueries = unwrapped.map((rawQuery: any, index: number) => {
        try {
          return this.mapQuery(rawQuery);
        } catch (error) {
          logger.warn(
            {
              event: "query_mapping_failed",
              toolName,
              index,
              error: error instanceof Error ? error.message : String(error),
            },
            `Failed to map query at index ${index} - skipping`
          );
          return null;
        }
      }).filter((q): q is DatasetQuery => q !== null);

      const durationMs = performance.now() - startTime;

      logger.debug(
        {
          event: "query_search_success",
          toolName,
          keyword,
          queryCount: mappedQueries.length,
          durationMs: Math.round(durationMs),
        },
        `Found ${mappedQueries.length} queries`
      );

      return {
        tool: toolName,
        durationMs,
        data: mappedQueries,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = performance.now() - startTime;

      logger.error(
        {
          event: "query_search_failed",
          toolName,
          keyword,
          error: errorMessage,
          durationMs: Math.round(durationMs),
        },
        `Failed to search queries: ${errorMessage}`
      );

      throw new Error(
        `Query search failed for keyword "${keyword}": ${errorMessage}`
      );
    }
  }


  private mapQuery(rawQuery: any): DatasetQuery {
    if (!rawQuery || typeof rawQuery !== "object") {
      throw new Error(`Invalid query object: expected object, got ${typeof rawQuery}`);
    }

    // Extract ID
    const id = rawQuery.id || rawQuery.queryId || rawQuery.query_id || rawQuery.urn;
    if (!id) {
      throw new Error(
        `Missing query ID. Expected one of: id, queryId, query_id, urn. Got keys: ${Object.keys(rawQuery).join(", ")}`
      );
    }

    // Extract SQL
    const sql = rawQuery.sql || rawQuery.query || rawQuery.queryText || rawQuery.text || rawQuery.statement;
    if (!sql) {
      throw new Error(
        `Missing SQL query text for ID "${id}". Expected one of: sql, query, queryText, text, statement. Got keys: ${Object.keys(rawQuery).join(", ")}`
      );
    }

    // Extract lastSeen (optional)
    const lastSeen = 
      rawQuery.lastSeen || 
      rawQuery.last_seen || 
      rawQuery.timestamp || 
      rawQuery.lastExecuted || 
      rawQuery.last_executed;

    // Validate against schema
    const query: DatasetQuery = {
      id: String(id),
      sql: String(sql),
      lastSeen: lastSeen ? String(lastSeen) : undefined,
    };

    // Validate
    DatasetQuerySchema.parse(query);

    return query;
  }
}