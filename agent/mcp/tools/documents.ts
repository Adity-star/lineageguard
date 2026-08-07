import { z } from "zod";

import { MCPClient } from "../client";

import {
  DocumentSchema,
  Document,
  MCPToolResponse,
} from "../types";

const DocumentsSchema = z.array(DocumentSchema);

export class DocumentTool {
  constructor(
    private readonly client: MCPClient
  ) {}

  /**
   * Semantic document search.
   */
  async searchDocuments(query: string): Promise<MCPToolResponse<Document[]>> {
    const startTime = performance.now();
    const client = (this.client as any).transport.getClient();

    const response = await client.callTool({
      name: "search_documents",
      arguments: { query },
    });

    const durationMs = performance.now() - startTime;

    // Parse the new MCP response format
    const result = response.structuredContent;

    if (!result || result.total === 0) {
      return {
        tool: "search_documents",
        durationMs,
        data: [],
      };
    }

    // Map searchResults to Document format
    const documents = (result.searchResults ?? []).map((item: any) => ({
      id: item.id || item.urn || "",
      title: item.title || item.name || "",
      snippet: item.snippet || item.content || "",
      url: item.url,
    }));

    return {
      tool: "search_documents",
      durationMs,
      data: documents,
    };
  }

  /**
   * Keyword / regex document search.
   */
  async grepDocuments(
    pattern: string
  ): Promise<MCPToolResponse<Document[]>> {
    return this.client.executeTool(
      "grep_documents",
      {
        pattern,
      },
      DocumentsSchema
    );
  }
}
