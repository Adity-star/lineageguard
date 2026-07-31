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
  async searchDocuments(
    query: string,
    limit = 10
  ): Promise<MCPToolResponse<Document[]>> {
    return this.client.executeTool(
      "search_documents",
      {
        query,
        limit,
      },
      DocumentsSchema
    );
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