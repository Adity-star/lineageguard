import { z } from 'zod';
import { logger } from '../../config/logger.js';
import { MCPClient } from '../client.js';
import { MCPResponseUnwrapper } from './mcp-response-unwrapper.js';
import { LineageMapper } from './lineage-mapper.js';
import { LineageSchema, Lineage, MCPToolResponse } from '../types.js';

/**
 * LineageTool wraps the get_lineage MCP tool.
 *
 * Handles MCP content wrapper format and maps DataHub lineage responses
 * to internal Lineage model using LineageMapper.
 */
export class LineageTool {
  constructor(private readonly client: MCPClient) {}

  /**
   * Get lineage (upstream and downstream) for a dataset.
   */
  async getLineage(urn: string): Promise<MCPToolResponse<Lineage>> {
    return this.executeLineageTool('get_lineage', { urn });
  }

  /**
   * Get upstream lineage only.
   */
  async getUpstream(urn: string): Promise<MCPToolResponse<Lineage>> {
    return this.executeLineageTool('get_lineage', {
      urn,
      direction: 'upstream',
    });
  }

  /**
   * Get downstream lineage only.
   */
  async getDownstream(urn: string): Promise<MCPToolResponse<Lineage>> {
    return this.executeLineageTool('get_lineage', {
      urn,
      direction: 'downstream',
    });
  }

  /**
   * Execute lineage tool with MCP content wrapper handling and response mapping.
   */
  private async executeLineageTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<MCPToolResponse<Lineage>> {
    const startTime = performance.now();

    try {
      logger.debug(
        {
          event: 'lineage_retrieval_start',
          toolName,
          args,
        },
        `Retrieving lineage for ${args.urn}`,
      );

      // Execute raw to get unwrapped response
      const rawResponse = await this.client.executeToolRaw(toolName, args);

      // Unwrap MCP content wrapper
      const unwrapped = MCPResponseUnwrapper.unwrapObject(
        rawResponse,
        toolName,
      );

      // Map using LineageMapper (handles various response formats)
      const mapped = LineageMapper.mapAndValidate(unwrapped);

      const durationMs = performance.now() - startTime;

      // Log diagnostics
      LineageMapper.logMappingDiagnostics(
        toolName,
        args,
        unwrapped,
        mapped,
        durationMs,
      );

      logger.debug(
        {
          event: 'lineage_retrieval_success',
          toolName,
          urn: args.urn,
          upstreamCount: mapped.upstream.length,
          downstreamCount: mapped.downstream.length,
          durationMs: Math.round(durationMs),
        },
        `Retrieved lineage: ${mapped.upstream.length} upstream, ${mapped.downstream.length} downstream`,
      );

      return {
        tool: toolName,
        durationMs,
        data: mapped,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const durationMs = performance.now() - startTime;

      logger.error(
        {
          event: 'lineage_retrieval_failed',
          toolName,
          args,
          error: errorMessage,
          durationMs: Math.round(durationMs),
        },
        `Failed to retrieve lineage: ${errorMessage}`,
      );

      throw new Error(
        `Lineage retrieval failed for ${args.urn}: ${errorMessage}`,
      );
    }
  }
}
