import { z } from "zod";
import { logger } from "../../config/logger.js";
import { MCPClient } from "../client.js";
import { MCPResponseUnwrapper } from "./mcp-response-unwrapper.js";
import {
  SchemaField,
  MCPToolResponse,
} from "../types.js";
import { SchemaFieldMapper } from "./schema-field-mapper.js";


export class SchemaTool {
  constructor(
    private readonly client: MCPClient
  ) {}

  /**
   * Get schema fields for a dataset.
   * 
   * Raw MCP response is unwrapped and mapped before validation to handle format variations.
   */
  async getSchema(
    urn: string
  ): Promise<MCPToolResponse<SchemaField[]>> {
    const toolName = "list_schema_fields";
    const requestPayload = { urn };
    const startTime = performance.now();

    try {
      logger.debug(
        {
          event: "schema_field_retrieval_start",
          toolName,
          urn,
        },
        `Retrieving schema fields for ${urn}`
      );

      // Execute MCP tool - raw response from DataHub
      const rawResponse = await this.client.executeToolRaw(
        toolName,
        requestPayload
      );

      // Unwrap MCP content wrapper
      const unwrapped = MCPResponseUnwrapper.unwrap(rawResponse, toolName);

      // Extract fields array from response
      // DataHub returns: { urn, fields: [...], totalFields, ... }
      const fieldsArray = MCPResponseUnwrapper.unwrapArray(unwrapped, toolName, "fields");

      // Map from DataHub format to internal format
      const mappedFields = SchemaFieldMapper.mapAndValidateMultiple(fieldsArray);

      const durationMs = performance.now() - startTime;

      // Log diagnostics
      SchemaFieldMapper.logMappingDiagnostics(
        toolName,
        requestPayload,
        fieldsArray,
        mappedFields,
        durationMs
      );

      logger.debug(
        {
          event: "schema_field_retrieval_success",
          toolName,
          urn,
          fieldCount: mappedFields.length,
          durationMs: Math.round(durationMs),
        },
        `Retrieved and mapped ${mappedFields.length} schema fields`
      );

      return {
        tool: toolName,
        durationMs,
        data: mappedFields,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const durationMs = performance.now() - startTime;

      logger.error(
        {
          event: "schema_field_retrieval_failed",
          toolName,
          urn,
          error: errorMessage,
          durationMs: Math.round(durationMs),
        },
        `Failed to retrieve or map schema fields: ${errorMessage}`
      );

      throw new Error(
        `Schema retrieval failed for ${urn}: ${errorMessage}`
      );
    }
  }

  /**
   * Get a specific field by path.
   */
  async getField(
    urn: string,
    fieldPath: string
  ): Promise<SchemaField | undefined> {
    const result = await this.getSchema(urn);
    return result.data.find(field => field.fieldPath === fieldPath);
  }

  /**
   * Check if a field exists.
   */
  async hasField(
    urn: string,
    fieldPath: string
  ): Promise<boolean> {
    const field = await this.getField(urn, fieldPath);
    return !!field;
  }
}