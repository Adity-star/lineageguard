import { logger } from '../config/logger.js';

/**
 * Detailed logging context for a mutation operation.
 */
export interface MutationLogContext {
  toolName: string;
  entityCount?: number;
  totalItems?: number;
  payloadSize?: number;
  responseStatus?: boolean;
  durationMs?: number;
  descriptionLength?: number;
  propertyCount?: number;
  fieldPath?: string;
}

/**
 * MutationLogger - Comprehensive logging for all mutation operations.
 *
 * Provides:
 * 1. Request payload logging with context
 * 2. Response tracing with success/failure details
 * 3. Performance metrics and timing
 * 4. Full traceability for debugging and auditing
 */
export class MutationLogger {
  /**
   * Log the start of a mutation operation.
   */
  static logMutationStart(
    toolName: string,
    payload: Record<string, any>,
    context?: Partial<MutationLogContext>,
  ): void {
    const payloadSize = JSON.stringify(payload).length;
    const entityCount =
      (Array.isArray(payload.entity_urns) ? payload.entity_urns.length : 0) +
      (Array.isArray(payload.entity_urn) ? 1 : 0);

    logger.info(
      {
        event: 'mutation_start',
        toolName,
        payloadSize,
        entityCount: entityCount || undefined,
        payloadKeys: Object.keys(payload),
        payloadPreview: this.sanitizePayload(payload),
        ...context,
      },
      `▶ Mutation START: ${toolName} (${entityCount || 1} entity, ${payloadSize}B)`,
    );
  }

  /**
   * Log successful mutation completion.
   */
  static logMutationSuccess(
    toolName: string,
    payload: Record<string, any>,
    response: any,
    durationMs: number,
    context?: Partial<MutationLogContext>,
  ): void {
    const responseSize = JSON.stringify(response).length;

    logger.info(
      {
        event: 'mutation_success',
        toolName,
        durationMs: Math.round(durationMs),
        requestSize: JSON.stringify(payload).length,
        responseSize,
        responseStatus: response.success,
        responseMessage: response.message,
        requestPayloadKeys: Object.keys(payload),
        ...context,
      },
      `✓ Mutation SUCCESS: ${toolName} (${Math.round(durationMs)}ms, response: ${responseSize}B)`,
    );
  }

  /**
   * Log mutation validation failure.
   */
  static logValidationFailure(
    toolName: string,
    errors: string[],
    warnings: string[],
  ): void {
    logger.error(
      {
        event: 'mutation_validation_failed',
        toolName,
        errorCount: errors.length,
        warningCount: warnings.length,
        errors,
        warnings,
      },
      `✗ Mutation VALIDATION FAILED: ${toolName}\nErrors: ${errors.join('; ')}\nWarnings: ${warnings.join('; ')}`,
    );
  }

  /**
   * Log mutation execution failure.
   */
  static logMutationFailure(
    toolName: string,
    payload: Record<string, any>,
    error: Error | string,
    durationMs: number,
    context?: Partial<MutationLogContext>,
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(
      {
        event: 'mutation_failed',
        toolName,
        durationMs: Math.round(durationMs),
        requestSize: JSON.stringify(payload).length,
        error: errorMessage,
        errorStack,
        requestPayloadKeys: Object.keys(payload),
        ...context,
      },
      `✗ Mutation FAILED: ${toolName} (${Math.round(durationMs)}ms)\nError: ${errorMessage}`,
    );
  }

  /**
   * Log MCP server response details (for debugging).
   */
  static logMCPResponse(
    toolName: string,
    request: Record<string, any>,
    response: any,
    isError: boolean,
  ): void {
    const responseSize = JSON.stringify(response).length;
    const requestSize = JSON.stringify(request).length;

    if (isError) {
      logger.error(
        {
          event: 'mcp_mutation_error_response',
          toolName,
          isError: true,
          requestSize,
          responseSize,
          responsePreview: this.truncateJson(response, 200),
        },
        `MCP mutation error: ${toolName} returned error response (${responseSize}B)`,
      );
    } else {
      logger.debug(
        {
          event: 'mcp_mutation_response',
          toolName,
          isError: false,
          requestSize,
          responseSize,
          responseKeys: this.getObjectKeys(response),
          responsePreview: this.sanitizePayload(response),
        },
        `MCP mutation response: ${toolName} (request: ${requestSize}B, response: ${responseSize}B)`,
      );
    }
  }

  /**
   * Sanitize a payload for logging (remove sensitive data).
   */
  private static sanitizePayload(payload: any): any {
    if (!payload) return payload;

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];

    const sanitized = { ...payload };
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Truncate JSON to a max length for logging.
   */
  private static truncateJson(obj: any, maxLength: number): any {
    const json = JSON.stringify(obj);
    if (json.length <= maxLength) {
      return obj;
    }
    return JSON.parse(json.substring(0, maxLength) + '...');
  }

  /**
   * Get top-level keys from an object.
   */
  private static getObjectKeys(obj: any): string[] {
    if (!obj || typeof obj !== 'object') {
      return [];
    }
    return Object.keys(obj).slice(0, 10); // First 10 keys
  }

  /**
   * Log a mutation batch operation.
   */
  static logMutationBatch(
    toolName: string,
    batchCount: number,
    totalEntities: number,
    startTime: number,
  ): void {
    const durationMs = Math.round(performance.now() - startTime);

    logger.info(
      {
        event: 'mutation_batch_complete',
        toolName,
        batchCount,
        totalEntities,
        durationMs,
        avgTimePerBatch: Math.round(durationMs / batchCount),
      },
      `✓ Mutation batch complete: ${toolName} (${batchCount} batches, ${totalEntities} entities, ${durationMs}ms)`,
    );
  }

  /**
   * Log mutation schema compatibility issue.
   */
  static logSchemaIssue(
    toolName: string,
    issue: string,
    discoveredSchema: any,
  ): void {
    logger.warn(
      {
        event: 'mutation_schema_issue',
        toolName,
        issue,
        schemaParameters: discoveredSchema.parameters?.map((p: any) => p.name),
        requiredParameters: discoveredSchema.requiredParameters,
      },
      `⚠ Mutation schema issue: ${toolName} - ${issue}`,
    );
  }
}
