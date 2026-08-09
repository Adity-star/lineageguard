import { logger } from '../../config/logger.js';

export class MCPResponseUnwrapper {
  /**
   * Unwrap MCP content wrapper if present.
   *
   * Handles three cases:
   * 1. MCP text content wrapper: [{ type: "text", text: "{...}" }]
   * 2. Direct response (no wrapper)
   * 3. Complex nested structures
   *
   * @param rawResponse Raw response from MCP server
   * @param toolName Tool name for logging
   * @returns Unwrapped and parsed response
   */
  static unwrap(rawResponse: any, toolName: string): any {
    // Case 1: Array with MCP content wrapper
    if (Array.isArray(rawResponse) && rawResponse.length > 0) {
      const firstItem = rawResponse[0];

      // Check if wrapped in MCP text content format
      if (
        firstItem &&
        firstItem.type === 'text' &&
        typeof firstItem.text === 'string'
      ) {
        try {
          const parsed = JSON.parse(firstItem.text);
          logger.debug(
            {
              event: 'mcp_content_unwrapped',
              toolName,
              wrappedSize: firstItem.text.length,
              unwrappedType: Array.isArray(parsed) ? 'array' : typeof parsed,
            },
            `Unwrapped MCP text content for ${toolName}`,
          );
          return parsed;
        } catch (parseError) {
          const errorMessage =
            parseError instanceof Error
              ? parseError.message
              : String(parseError);
          throw new Error(
            `Failed to parse MCP text content for ${toolName}: ${errorMessage}. Text preview: ${firstItem.text.substring(0, 200)}`,
          );
        }
      }
    }

    // Case 2: Direct response (no wrapper needed)
    logger.debug(
      {
        event: 'mcp_content_direct',
        toolName,
        responseType: Array.isArray(rawResponse) ? 'array' : typeof rawResponse,
      },
      `No unwrapping needed for ${toolName} response`,
    );
    return rawResponse;
  }

  /**
   * Unwrap and extract array from response.
   *
   * Handles responses that might be:
   * - Direct array: [item1, item2, ...]
   * - Wrapped array: [{ type: "text", text: "[...]" }]
   * - Object with array field: { items: [...], total: 10 }
   * - Empty result object: { start: 0, total: 0, count: 0 }
   *
   * @param rawResponse Raw response from MCP server
   * @param toolName Tool name for logging
   * @param arrayFieldName Optional field name if array is nested (e.g., "fields", "items")
   * @returns Unwrapped array (empty array if no data found)
   */
  static unwrapArray(
    rawResponse: any,
    toolName: string,
    arrayFieldName?: string,
  ): any[] {
    // First unwrap MCP content wrapper if present
    const unwrapped = this.unwrap(rawResponse, toolName);

    // If unwrapped is already an array, return it
    if (Array.isArray(unwrapped)) {
      return unwrapped;
    }

    // If unwrapped is an object, try to extract array from known field names
    if (unwrapped && typeof unwrapped === 'object') {
      // Try specified field name first
      if (arrayFieldName && Array.isArray(unwrapped[arrayFieldName])) {
        logger.debug(
          {
            event: 'mcp_array_extracted',
            toolName,
            fieldName: arrayFieldName,
            arrayLength: unwrapped[arrayFieldName].length,
          },
          `Extracted array from ${arrayFieldName} field`,
        );
        return unwrapped[arrayFieldName];
      }

      // Try common field names
      const commonArrayFields = [
        'items',
        'results',
        'data',
        'entities',
        'fields',
        'queries',
      ];
      for (const fieldName of commonArrayFields) {
        if (Array.isArray(unwrapped[fieldName])) {
          logger.debug(
            {
              event: 'mcp_array_extracted',
              toolName,
              fieldName,
              arrayLength: unwrapped[fieldName].length,
            },
            `Extracted array from ${fieldName} field`,
          );
          return unwrapped[fieldName];
        }
      }

      // Check if this is an empty result object (e.g., { start: 0, total: 0, count: 0 })
      if (
        unwrapped.total === 0 ||
        unwrapped.count === 0 ||
        (unwrapped.start === 0 && Object.keys(unwrapped).length <= 3)
      ) {
        logger.debug(
          {
            event: 'mcp_empty_result',
            toolName,
            response: unwrapped,
          },
          `Response indicates empty result - returning empty array`,
        );
        return [];
      }
    }

    // Failed to extract array
    throw new Error(
      `Expected array from ${toolName}, but got ${typeof unwrapped}. ` +
        `Response structure: ${JSON.stringify(unwrapped).substring(0, 200)}`,
    );
  }

  /**
   * Unwrap and extract object from response.
   *
   * Handles responses that might be:
   * - Direct object: { key: value, ... }
   * - Wrapped object: [{ type: "text", text: "{...}" }]
   *
   * @param rawResponse Raw response from MCP server
   * @param toolName Tool name for logging
   * @returns Unwrapped object
   */
  static unwrapObject(rawResponse: any, toolName: string): any {
    // First unwrap MCP content wrapper if present
    const unwrapped = this.unwrap(rawResponse, toolName);

    // Validate it's an object
    if (
      !unwrapped ||
      typeof unwrapped !== 'object' ||
      Array.isArray(unwrapped)
    ) {
      throw new Error(
        `Expected object from ${toolName}, but got ${Array.isArray(unwrapped) ? 'array' : typeof unwrapped}. ` +
          `Response: ${JSON.stringify(unwrapped).substring(0, 200)}`,
      );
    }

    return unwrapped;
  }
}
