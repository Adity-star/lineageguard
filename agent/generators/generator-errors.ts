/**
 * Custom error class for generator errors.
 */
export class GeneratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeneratorError';
  }
}

/**
 * Schema safety gate helper for validating columns against DataHub context.
 */
export class SchemaSafetyGate {
  /**
   * Get a set of existing field paths from the schema.
   */
  static getExistingFields(schema: Array<{ fieldPath: string }>): Set<string> {
    return new Set(schema.map(field => field.fieldPath));
  }

  /**
   * Validate that a column exists in the schema.
   * Supports nested field paths like shipment_info.geo_info.lat
   * @throws GeneratorError if column does not exist
   */
  static validateColumnExists(
    columnName: string,
    existingFields: Set<string>,
    operation: string = 'operation'
  ): void {
    // Check for exact match first
    if (existingFields.has(columnName)) {
      return;
    }

    // For nested paths, check if any parent field exists (for safety)
    // This allows operations on nested fields even if the exact path isn't directly in the schema
    const segments = columnName.split('.');
    for (let i = 0; i < segments.length - 1; i++) {
      const parentPath = segments.slice(0, i + 1).join('.');
      if (existingFields.has(parentPath)) {
        // Parent exists, so the nested path is likely valid
        return;
      }
    }

    throw new GeneratorError(
      `Cannot ${operation} column "${columnName}": column does not exist in DataHub schema. Available fields: ${Array.from(existingFields).join(', ')}`
    );
  }

  /**
   * Validate that a column does NOT exist in the schema.
   * @throws GeneratorError if column already exists
   */
  static validateColumnNotExists(
    columnName: string,
    existingFields: Set<string>,
    operation: string = 'operation'
  ): void {
    if (existingFields.has(columnName)) {
      throw new GeneratorError(
        `Cannot ${operation} column "${columnName}": column already exists in DataHub schema`
      );
    }
  }

  /**
   * Validate a drop_column operation.
   * @throws GeneratorError if column does not exist
   */
  static validateDropColumn(
    columnName: string,
    existingFields: Set<string>
  ): void {
    this.validateColumnExists(columnName, existingFields, 'drop');
  }

  /**
   * Validate a rename_column operation.
   * @throws GeneratorError if source doesn't exist or target already exists
   */
  static validateRenameColumn(
    sourceColumn: string,
    targetColumn: string,
    existingFields: Set<string>
  ): void {
    this.validateColumnExists(sourceColumn, existingFields, 'rename');
    this.validateColumnNotExists(targetColumn, existingFields, 'rename to');
  }
}
