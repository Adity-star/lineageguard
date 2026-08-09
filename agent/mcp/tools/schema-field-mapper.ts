import { logger } from '../../config/logger.js';
import { SchemaField, SchemaFieldSchema } from '../types.js';

/**
 * Maps DataHub MCP server schema field responses to internal SchemaField model.
 *
 * Handles variations in response format across DataHub MCP versions:
 * - field_path vs fieldPath vs path
 * - nativeDataType vs type vs nativeType
 * - isNullable vs nullable vs required
 * - And other naming variations
 *
 * This isolation ensures the internal model remains stable even when
 * the MCP server changes its response format.
 */
export class SchemaFieldMapper {
  static mapField(rawField: any): SchemaField {
    if (!rawField || typeof rawField !== 'object') {
      throw new Error(
        `Invalid field object: expected object, got ${typeof rawField}`,
      );
    }

    // Extract fieldPath from various possible names
    const fieldPath = this.extractFieldPath(rawField);
    if (!fieldPath) {
      throw new Error(
        `Missing field path in schema field. Expected one of: fieldPath, field_path, path, fieldName. Got keys: ${Object.keys(rawField).join(', ')}`,
      );
    }

    // Extract type from various possible names
    const type = this.extractType(rawField);
    if (!type) {
      throw new Error(
        `Missing type in schema field for "${fieldPath}". Expected one of: type, nativeDataType, nativeType. Got keys: ${Object.keys(rawField).join(', ')}`,
      );
    }

    // Extract nullable from various possible names
    const nullable = this.extractNullable(rawField);

    // Extract description
    const description = this.extractDescription(rawField);

    // Extract tags
    const tags = this.extractTags(rawField);

    return {
      fieldPath,
      type,
      nullable,
      description,
      tags,
    };
  }

  /**
   * Map an array of raw MCP response fields.
   */
  static mapFields(rawFields: any[]): SchemaField[] {
    if (!Array.isArray(rawFields)) {
      throw new Error(`Expected array of fields, got ${typeof rawFields}`);
    }

    if (rawFields.length === 0) {
      return [];
    }

    return rawFields.map((field, index) => {
      try {
        return this.mapField(field);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to map field at index ${index}: ${errorMessage}`,
        );
      }
    });
  }

  /**
   * Extract fieldPath from various naming conventions.
   */
  private static extractFieldPath(field: any): string | null {
    // Try common naming conventions in order of preference
    if (typeof field.fieldPath === 'string') return field.fieldPath;
    if (typeof field.field_path === 'string') return field.field_path;
    if (typeof field.path === 'string') return field.path;
    if (typeof field.fieldName === 'string') return field.fieldName;
    if (typeof field.name === 'string') return field.name;
    return null;
  }

  /**
   * Extract type from various naming conventions.
   */
  private static extractType(field: any): string | null {
    // Try common naming conventions
    if (typeof field.type === 'string') return field.type;
    if (typeof field.nativeDataType === 'string') return field.nativeDataType;
    if (typeof field.nativeType === 'string') return field.nativeType;
    if (typeof field.dataType === 'string') return field.dataType;

    // Handle complex type objects (e.g., { type: "STRING" })
    if (
      field.type &&
      typeof field.type === 'object' &&
      typeof field.type.type === 'string'
    ) {
      return field.type.type;
    }

    return null;
  }

  /**
   * Extract nullable from various naming conventions.
   *
   * Handles:
   * - nullable: true/false
   * - isNullable: true/false
   * - required: true/false (inverted)
   */
  private static extractNullable(field: any): boolean {
    // Explicit nullable field
    if (typeof field.nullable === 'boolean') {
      return field.nullable;
    }

    // Explicit isNullable field
    if (typeof field.isNullable === 'boolean') {
      return field.isNullable;
    }

    // Inverted required field
    if (typeof field.required === 'boolean') {
      return !field.required;
    }

    // Default to false (not nullable) if not specified
    return false;
  }

  /**
   * Extract description from various naming conventions.
   */
  private static extractDescription(field: any): string | undefined {
    if (typeof field.description === 'string') return field.description;
    if (typeof field.doc === 'string') return field.doc;
    if (typeof field.comment === 'string') return field.comment;
    if (typeof field.documentation === 'string') return field.documentation;
    return undefined;
  }

  /**
   * Extract tags from various naming conventions.
   */
  private static extractTags(field: any): string[] {
    // Existing tags array
    if (Array.isArray(field.tags)) {
      return field.tags.filter((tag: any) => typeof tag === 'string');
    }

    // DataHub-specific: editedTags array
    if (Array.isArray(field.editedTags)) {
      return field.editedTags.filter((tag: any) => typeof tag === 'string');
    }

    // Alternative: labels array
    if (Array.isArray(field.labels)) {
      return field.labels.filter((label: any) => typeof label === 'string');
    }

    // Alternative: tag_urns array
    if (Array.isArray(field.tag_urns)) {
      return field.tag_urns.filter((urn: any) => typeof urn === 'string');
    }

    return [];
  }

  /**
   * Validate and parse a raw MCP response, using internal SchemaField schema.
   *
   * Should only be called AFTER mapping from DataHub format.
   */
  static validateMappedField(field: SchemaField): {
    valid: boolean;
    error?: string;
  } {
    try {
      SchemaFieldSchema.parse(field);
      return { valid: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { valid: false, error: errorMessage };
    }
  }

  static mapAndValidate(rawField: any): SchemaField {
    // Map from DataHub format to internal format
    const mapped = this.mapField(rawField);

    // Validate the mapped object
    const validation = this.validateMappedField(mapped);
    if (!validation.valid) {
      throw new Error(
        `Schema field validation failed after mapping: ${validation.error}. Mapped object: ${JSON.stringify(mapped)}`,
      );
    }

    return mapped;
  }

  /**
   * Complete flow for multiple fields.
   */
  static mapAndValidateMultiple(rawFields: any[]): SchemaField[] {
    return rawFields.map((field, index) => {
      try {
        return this.mapAndValidate(field);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to map field at index ${index}: ${errorMessage}. Raw field: ${JSON.stringify(field)}`,
        );
      }
    });
  }

  /**
   * Log mapping diagnostics.
   */
  static logMappingDiagnostics(
    toolName: string,
    requestPayload: any,
    rawResponse: any[],
    mappedFields: SchemaField[],
    durationMs: number,
  ): void {
    logger.debug(
      {
        event: 'schema_field_mapping_complete',
        toolName,
        requestPayload,
        rawResponseCount: rawResponse?.length ?? 0,
        mappedFieldCount: mappedFields.length,
        durationMs: Math.round(durationMs),
        sampleRawField:
          rawResponse && rawResponse.length > 0 ? rawResponse[0] : undefined,
        sampleMappedField:
          mappedFields.length > 0 ? mappedFields[0] : undefined,
      },
      `Mapped ${mappedFields.length} schema fields from MCP response`,
    );
  }
}
