import { ExecutionPlan } from '../planner/types.js';
import { ContextBundle } from '../context/type.js';
import { DDLGenerator, DDLGenerationOptions } from './ddl-generator.js';
import { SQLValidator } from './sql-validator.js';
import { DDLArtifact } from './types.js';
import { logger } from '../config/logger.js';
import { SchemaSafetyGate, GeneratorError } from './generator-errors.js';

/**
 * Platform-aware SQL generator that replaces PrismaGenerator.
 *
 * Takes schema fields from the ContextBundle and generates platform-specific
 * DDL based on the target database platform from DataHub metadata.
 *
 * Replaces the Prisma-based approach that assumed all entities were Postgres.
 *
 * Features:
 * - Generates platform-specific DDL (Snowflake, Postgres, BigQuery, MySQL, Redshift, T-SQL)
 * - Validates DDL syntax using a SQL parser
 * - Marks artifacts with validation status for the approval workflow
 */
export class PlatformAwareSQLGenerator {
  private readonly ddl: DDLGenerator;
  private readonly validator: SQLValidator;

  constructor() {
    this.ddl = new DDLGenerator();
    this.validator = new SQLValidator();
  }

  /**
   * Generate platform-specific DDL from context and execution plan.
   *
   * @param context The ContextBundle containing schema and platform metadata
   * @param plan The execution plan with platform information
   * @returns DDLArtifact with platform-specific DDL statement
   */
  public async generate(
    context: ContextBundle,
    plan: ExecutionPlan,
  ): Promise<DDLArtifact> {
    const startTime = performance.now();

    try {
      logger.info(
        {
          event: 'platform_aware_sql_generation_start',
          datasetName: context.dataset.name,
          platform: plan.platform || context.dataset.platform,
          fieldCount: context.schema.length,
          planActions: plan.requiredChanges?.length || 0,
        },
        `PlatformAwareSQLGenerator starting for ${context.dataset.name}`,
      );

      // Extract platform from plan or context
      let platform = plan.platform || context.dataset.platform || 'unknown';

      // CRITICAL: Resolve HDFS to appropriate SQL dialect before any generation
      if (platform.toLowerCase() === 'hdfs') {
        logger.warn(
          {
            event: 'hdfs_platform_resolution',
            originalPlatform: platform,
            resolvedPlatform: 'hive',
          },
          `Resolving HDFS platform to Hive SQL for DDL generation`,
        );
        platform = 'hive'; // Resolve HDFS to Hive SQL
      }

      const tableName = context.dataset.name;
      const schemaName = plan.schemaName;

      // Validate we have schema fields
      if (!context.schema || context.schema.length === 0) {
        throw new Error(
          `No schema fields available for ${tableName}. Cannot generate DDL.`,
        );
      }

      // Initialize schema safety gate
      const existingFields = SchemaSafetyGate.getExistingFields(context.schema);

      // Process each required change deterministically
      if (!plan.requiredChanges || plan.requiredChanges.length === 0) {
        throw new Error(
          'No required changes in plan. Cannot generate DDL.'
        );
      }

      logger.info(
        {
          event: 'processing_required_changes',
          changeCount: plan.requiredChanges.length,
          changes: plan.requiredChanges,
        },
        `Processing ${plan.requiredChanges.length} required changes`,
      );

      const ddlStatements: string[] = [];
      const allAffectedColumns: string[] = [];

      // Check if we have mixed operation types
      const changeTypes = new Set(
        plan.requiredChanges.map(c => c.type?.toLowerCase().trim().replace(/\s+/g, '_') || '')
      );
      const hasMixedOperations = changeTypes.size > 1;

      // For DROP COLUMN operations, resolve hierarchical conflicts and deduplicate
      let dropColumnsToProcess: string[] = [];
      if (plan.affectedColumns && plan.affectedColumns.length > 0) {
        dropColumnsToProcess = this.resolveDropColumnConflicts(plan.affectedColumns);
        logger.info(
          {
            event: 'drop_column_conflict_resolution',
            originalColumns: plan.affectedColumns,
            resolvedColumns: dropColumnsToProcess,
          },
          `Resolved DROP COLUMN conflicts: ${plan.affectedColumns.length} -> ${dropColumnsToProcess.length} columns`,
        );
      }

      // Process each required change with proper separation of operation types
      for (const change of plan.requiredChanges) {
        const changeType = change.type?.toLowerCase().trim().replace(/\s+/g, '_') || '';
        
        logger.info(
          {
            event: 'processing_change',
            changeType,
            description: change.description,
            sourceColumn: change.sourceColumn,
            targetColumn: change.targetColumn,
          },
          `Processing change: ${changeType}`,
        );

        switch (changeType) {
          case 'add_column':
            const addColumn = this.processAddColumn(
              context,
              plan,
              change,
              existingFields,
              platform
            );
            ddlStatements.push(addColumn.ddl);
            allAffectedColumns.push(...addColumn.columns);
            break;

          case 'drop_column':
            // For DROP COLUMN, use resolved drop columns if available
            if (dropColumnsToProcess.length > 0) {
              // Generate DDL for each resolved drop column
              for (const columnName of dropColumnsToProcess) {
                SchemaSafetyGate.validateDropColumn(columnName, existingFields);

                logger.info(
                  {
                    event: 'processing_drop_column_resolved',
                    columnName,
                    platform,
                  },
                  `Processing DROP COLUMN for: ${columnName}`,
                );

                const ddl = this.generateAlterDropColumn(context, plan, columnName);
                ddlStatements.push(ddl);
                allAffectedColumns.push(columnName);
              }
            } else {
              // Fallback to extracting from change description
              const dropColumn = this.processDropColumn(
                context,
                plan,
                change,
                existingFields,
                platform
              );
              if (dropColumn.ddl) {
                ddlStatements.push(dropColumn.ddl);
                allAffectedColumns.push(...dropColumn.columns);
              }
            }
            break;

          case 'rename_column':
            const renameColumn = this.processRenameColumn(
              context,
              plan,
              change,
              existingFields,
              platform
            );
            ddlStatements.push(renameColumn.ddl);
            allAffectedColumns.push(...renameColumn.columns);
            break;

          default:
            logger.warn(
              {
                event: 'unsupported_change_type',
                changeType,
              },
              `Unsupported change type: ${changeType}, skipping`,
            );
        }
      }

      if (ddlStatements.length === 0) {
        throw new Error(
          'No valid DDL statements generated from required changes'
        );
      }

      const ddlStatement = ddlStatements.join('\n\n');
      const fieldCount = allAffectedColumns.length;

      // Determine primary operation type for metadata
      const primaryOperationType = plan.requiredChanges[0]?.type?.toLowerCase().trim().replace(/\s+/g, '_') || 'unknown';

      logger.info(
        {
          event: 'ddl_statements_generated',
          statementCount: ddlStatements.length,
          primaryOperationType,
          affectedColumns: allAffectedColumns,
        },
        `Generated ${ddlStatements.length} DDL statements`,
      );

      // Create artifact
      let artifact: DDLArtifact = {
        ddl: ddlStatement,
        platform: platform as any,
        tableName,
        operationType: primaryOperationType,
        validationStatus: 'generated',
        fieldCount,
        notes: [
          `Generated ${primaryOperationType.toUpperCase()} DDL for ${platform.toUpperCase()}`,
          `Affected columns: ${allAffectedColumns.join(', ')}`,
        ],
      };

      // Add formatted version for display
      artifact = {
        ...artifact,
        formatted: ddlStatement,
      } as any;

      // Validate the generated DDL with semantic checks
      const validationResult = this.validator.validate(
        artifact.ddl,
        artifact.platform as string,
        primaryOperationType,
        allAffectedColumns,
      );

      // Update artifact with validation results
      if (validationResult.valid) {
        artifact = {
          ...artifact,
          validationStatus: 'validated',
          notes: [
            ...(artifact.notes || []),
            `✓ DDL validated for ${artifact.platform.toUpperCase()}`,
          ],
        };

        logger.info(
          {
            event: 'platform_aware_sql_validation_passed',
            platform: artifact.platform,
            tableName: artifact.tableName,
            warnings: validationResult.warnings.length,
          },
          `✓ DDL validation passed`,
        );
      } else {
        // Mark as unvalidated with errors
        artifact = {
          ...artifact,
          validationStatus: 'unvalidated',
          validationErrors: validationResult.errors,
          notes: [
            ...(artifact.notes || []),
            `⚠ DDL validation found ${validationResult.errors.length} error(s)`,
          ],
        };

        logger.warn(
          {
            event: 'platform_aware_sql_validation_failed',
            platform: artifact.platform,
            tableName: artifact.tableName,
            errors: validationResult.errors,
            warnings: validationResult.warnings,
          },
          `⚠ DDL validation found errors - review before applying`,
        );
      }

      // Add warnings to notes
      if (validationResult.warnings.length > 0) {
        artifact.notes = [
          ...(artifact.notes || []),
          ...validationResult.warnings.map((w) => `⚠ ${w}`),
        ];
      }

      logger.info(
        {
          event: 'platform_aware_sql_generation_success',
          platform: artifact.platform,
          tableName: artifact.tableName,
          fieldCount: artifact.fieldCount,
          validationStatus: artifact.validationStatus,
          primaryOperationType,
          durationMs: performance.now() - startTime,
        },
        `✓ Platform-aware SQL Generated (${artifact.platform}, ${primaryOperationType})`,
      );

      return artifact;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(
        {
          event: 'platform_aware_sql_generation_failed',
          platform: plan.platform || context.dataset.platform,
          datasetName: context.dataset.name,
          error: errorMessage,
          durationMs: performance.now() - startTime,
        },
        `PlatformAwareSQLGenerator failed: ${errorMessage}`,
      );

      throw error;
    }
  }

  /**
   * Process an add_column change with schema safety validation.
   * For ADD COLUMN operations, uses exact affectedColumns from plan if available.
   */
  private processAddColumn(
    context: ContextBundle,
    plan: ExecutionPlan,
    change: any,
    existingFields: Set<string>,
    platform: string
  ): { ddl: string; columns: string[] } {
    const columnName = change.sourceColumn || this.extractColumnNameFromChange(change);
    
    if (!columnName) {
      throw new GeneratorError(
        `ADD COLUMN operation requires a column name in sourceColumn or description`
      );
    }

    // Schema safety: validate column doesn't already exist
    SchemaSafetyGate.validateColumnNotExists(columnName, existingFields, 'add');

    logger.info(
      {
        event: 'processing_add_column',
        columnName,
        platform,
      },
      `Processing ADD COLUMN for: ${columnName}`,
    );

    const ddl = this.generateAlterAddColumn(context, plan, columnName);
    
    // Use affectedColumns from plan if available, otherwise use the extracted column name
    const columns = plan.affectedColumns?.filter(col => col === columnName) || [columnName];
    
    return {
      ddl,
      columns,
    };
  }

  /**
   * Process a drop_column change with schema safety validation.
   */
  private processDropColumn(
    context: ContextBundle,
    plan: ExecutionPlan,
    change: any,
    existingFields: Set<string>,
    platform: string
  ): { ddl: string; columns: string[] } {
    const columnName = change.sourceColumn || this.extractColumnNameFromChange(change);
    
    if (!columnName) {
      throw new GeneratorError(
        `DROP COLUMN operation requires a column name in sourceColumn or description`
      );
    }

    // Schema safety: validate column exists
    SchemaSafetyGate.validateDropColumn(columnName, existingFields);

    logger.info(
      {
        event: 'processing_drop_column',
        columnName,
        platform,
      },
      `Processing DROP COLUMN for: ${columnName}`,
    );

    const ddl = this.generateAlterDropColumn(context, plan, columnName);
    
    return {
      ddl,
      columns: [columnName],
    };
  }

  /**
   * Process a rename_column change with schema safety validation.
   * For RENAME COLUMN operations, uses exact affectedColumns from plan if available.
   */
  private processRenameColumn(
    context: ContextBundle,
    plan: ExecutionPlan,
    change: any,
    existingFields: Set<string>,
    platform: string
  ): { ddl: string; columns: string[] } {
    // Try to get source and target columns from change or extract from description
    const renameColumns = this.extractRenameColumns(change);
    
    if (!renameColumns) {
      throw new GeneratorError(
        `RENAME COLUMN operation requires both sourceColumn and targetColumn, or a description like "Rename column A to B"`
      );
    }

    const { sourceColumn, targetColumn } = renameColumns;

    // Schema safety: validate source exists and target doesn't exist
    SchemaSafetyGate.validateRenameColumn(sourceColumn, targetColumn, existingFields);

    logger.info(
      {
        event: 'processing_rename_column',
        sourceColumn,
        targetColumn,
        platform,
      },
      `Processing RENAME COLUMN: ${sourceColumn} -> ${targetColumn}`,
    );

    const ddl = this.generateAlterRenameColumn(
      context,
      plan,
      sourceColumn,
      targetColumn,
      platform
    );
    
    // Use affectedColumns from plan if available, otherwise use source and target
    const columns = plan.affectedColumns?.filter(col => 
      col === sourceColumn || col === targetColumn
    ) || [sourceColumn, targetColumn];
    
    return {
      ddl,
      columns,
    };
  }

  /**
   * Extract column name from change description (fallback).
   * Supports nested column paths like shipment_info.geo_info.lat
   * Returns null for generic descriptions like "and its subfields"
   */
  private extractColumnNameFromChange(change: any): string | null {
    const description = change.description || '';
    
    // Skip generic descriptions that don't specify exact columns
    if (description.toLowerCase().includes('and its subfields') || 
        description.toLowerCase().includes('and subfields')) {
      return null;
    }
    
    // Match patterns like "Remove column shipment_info.geo_info.lat"
    const match = description.match(/(?:add|drop|remove|rename)\s+(?:column\s+)?([\w.]+)/i);
    logger.info(
      {
        event: 'extract_column_name_attempt',
        description,
        match: match ? match[1] : null,
      },
      `Attempting to extract column name from description`,
    );
    return match ? match[1] : null;
  }

  private resolveDropColumnConflicts(columns: string[]): string[] {
    if (!columns || columns.length === 0) {
      return [];
    }

    // Remove duplicates first
    const uniqueColumns = [...new Set(columns)];

    // Build hierarchy map
    const hierarchy = new Map<string, string[]>();
    for (const col of uniqueColumns) {
      const segments = col.split('.');
      for (let i = 0; i < segments.length; i++) {
        const parent = segments.slice(0, i).join('.');
        if (parent) {
          if (!hierarchy.has(parent)) {
            hierarchy.set(parent, []);
          }
          hierarchy.get(parent)!.push(col);
        }
      }
    }

    // Determine which columns to keep
    const columnsToKeep = new Set<string>();
    const columnsToRemove = new Set<string>();

    for (const col of uniqueColumns) {
      const isParent = hierarchy.has(col);
      
      if (isParent) {
        // This is a parent field
        const children = hierarchy.get(col) || [];
        
        // Check if any children are also being dropped
        const childrenBeingDropped = children.filter(child => uniqueColumns.includes(child));
        
        if (childrenBeingDropped.length > 0) {
          // Parent and children both being dropped - keep only parent (more efficient)
          columnsToKeep.add(col);
          childrenBeingDropped.forEach(child => columnsToRemove.add(child));
        } else {
          // Only parent being dropped
          columnsToKeep.add(col);
        }
      } else {
        // This is a child field
        const parent = col.split('.').slice(0, -1).join('.');
        
        if (parent && uniqueColumns.includes(parent)) {
          // Parent is also being dropped - let parent handle it
          columnsToRemove.add(col);
        } else {
          // Only child being dropped
          columnsToKeep.add(col);
        }
      }
    }

    const resolved = Array.from(columnsToKeep).filter(col => !columnsToRemove.has(col));
    
    logger.info(
      {
        event: 'drop_column_conflict_resolution_detail',
        original: uniqueColumns,
        resolved,
        removed: Array.from(columnsToRemove),
      },
      `DROP COLUMN conflict resolution detail`,
    );

    return resolved;
  }

  /**
   * Extract source and target columns from rename description (fallback).
   * Supports patterns like "Rename column A to B" or "Rename A to B"
   */
  private extractRenameColumns(change: any): { sourceColumn: string; targetColumn: string } | null {
    // First check if already provided
    if (change.sourceColumn && change.targetColumn) {
      return {
        sourceColumn: change.sourceColumn,
        targetColumn: change.targetColumn
      };
    }

    const description = change.description || '';
    
    // Match patterns like "Rename column shipment_info.target to customer_target"
    // or "Rename shipment_info.target to customer_target"
    const match = description.match(/(?:rename\s+(?:column\s+)?)?([\w.]+)\s+to\s+([\w.]+)/i);
    
    if (match && match[1] && match[2]) {
      logger.info(
        {
          event: 'extract_rename_columns_attempt',
          description,
          sourceColumn: match[1],
          targetColumn: match[2],
        },
        `Extracted rename columns from description`,
      );
      return {
        sourceColumn: match[1],
        targetColumn: match[2]
      };
    }

    logger.warn(
      {
        event: 'extract_rename_columns_failed',
        description,
      },
      `Could not extract source and target columns from rename description`,
    );
    
    return null;
  }

  /**
   * Generate ALTER TABLE RENAME COLUMN statement.
   */
  private generateAlterRenameColumn(
    context: ContextBundle,
    plan: ExecutionPlan,
    sourceColumn: string,
    targetColumn: string,
    platform: string
  ): string {
    // Resolve HDFS to Hive SQL
    let normalizedPlatform = platform.toLowerCase();
    if (normalizedPlatform === 'hdfs') {
      normalizedPlatform = 'hive';
    }

    const tableName = context.dataset.name;
    const schemaName = plan.schemaName;

    // Get source column type from schema for proper migration
    const sourceField = context.schema.find((f) => f.fieldPath === sourceColumn);
    if (!sourceField) {
      throw new GeneratorError(
        `Source column "${sourceColumn}" not found in schema for type retrieval`
      );
    }

    logger.info(
      {
        event: 'rename_column_type_retrieval',
        sourceColumn,
        sourceType: sourceField.type,
      },
      `Retrieved source column type: ${sourceField.type}`,
    );

    return this.ddl.generateAlterRenameColumn(
      tableName,
      sourceColumn,
      targetColumn,
      normalizedPlatform as any,
      schemaName,
    );
  }

  /**
   * Determine the operation type from the execution plan.
   * This is now only used as a fallback for CREATE TABLE operations.
   */
  private determineOperationType(plan: ExecutionPlan): string {
    if (!plan.requiredChanges || plan.requiredChanges.length === 0) {
      logger.warn(
        {
          event: 'no_required_changes',
          plan,
        },
        `No required changes in plan, defaulting to create_table`,
      );
      return 'create_table'; // Default to CREATE TABLE
    }

    const firstChange = plan.requiredChanges[0];
    if (!firstChange) {
      logger.warn(
        {
          event: 'first_change_undefined',
          plan,
        },
        `First change is undefined, defaulting to create_table`,
      );
      return 'create_table';
    }

    const changeType =
      firstChange.type?.toLowerCase().trim().replace(/\s+/g, '_') || '';
    const changeDescription = firstChange.description?.toLowerCase() || '';

    logger.info(
      {
        event: 'operation_type_detection',
        changeType,
        changeDescription,
        fullChange: firstChange,
      },
      `Detecting operation type from change: ${changeType}`,
    );

    // Check for add column operations - EXACT match first
    if (changeType === 'add_column') {
      logger.info(
        { event: 'operation_type_add_column_exact' },
        `Detected ADD COLUMN operation (exact match)`,
      );
      return 'add_column';
    }

    // Check for add column operations - partial match
    if (changeType.includes('add') && changeType.includes('column')) {
      logger.info(
        { event: 'operation_type_add_column_partial' },
        `Detected ADD COLUMN operation (partial match)`,
      );
      return 'add_column';
    }

    // Check for add column operations - description match
    if (
      changeDescription.includes('add') &&
      changeDescription.includes('column')
    ) {
      logger.info(
        { event: 'operation_type_add_column_description' },
        `Detected ADD COLUMN operation (description match)`,
      );
      return 'add_column';
    }

    // Check for drop column operations
    if (
      changeType === 'drop_column' ||
      (changeType.includes('drop') && changeType.includes('column')) ||
      (changeDescription.includes('drop') &&
        changeDescription.includes('column'))
    ) {
      logger.info(
        { event: 'operation_type_drop_column' },
        `Detected DROP COLUMN operation`,
      );
      return 'drop_column';
    }

    // Check for create table operations
    if (
      changeType === 'create_table' ||
      (changeType.includes('create') && changeType.includes('table')) ||
      (changeDescription.includes('create') &&
        changeDescription.includes('table'))
    ) {
      logger.info(
        { event: 'operation_type_create_table' },
        `Detected CREATE TABLE operation`,
      );
      return 'create_table';
    }

    // Default to CREATE TABLE for unknown operations
    logger.warn(
      {
        event: 'unknown_operation_type',
        changeType,
        changeDescription,
      },
      `Unknown operation type, defaulting to create_table`,
    );
    return 'create_table';
  }

  /**
   * Extract column names from the execution plan.
   */
  private extractColumnNames(plan: ExecutionPlan): string[] {
    const columns = plan.affectedColumns || [];

    logger.info(
      {
        event: 'extract_column_names',
        affectedColumns: plan.affectedColumns,
        extractedColumns: columns,
        requiredChanges: plan.requiredChanges,
      },
      `Extracted ${columns.length} column names from plan`,
    );

    if (
      columns.length === 0 &&
      plan.requiredChanges &&
      plan.requiredChanges.length > 0
    ) {
      // Fallback: try to extract from required changes descriptions
      const fallbackColumns: string[] = [];
      for (const change of plan.requiredChanges) {
        if (change.description) {
          const match = change.description.match(
            /(?:add|drop|rename)\s+(?:column\s+)?(\w+)/i,
          );
          if (match && match[1]) {
            fallbackColumns.push(match[1]);
          }
        }
      }

      if (fallbackColumns.length > 0) {
        logger.warn(
          {
            event: 'column_names_fallback',
            originalAffectedColumns: plan.affectedColumns,
            fallbackColumns,
          },
          `No affectedColumns, extracted ${fallbackColumns.length} columns from requiredChanges descriptions`,
        );
        return fallbackColumns;
      }
    }

    return columns;
  }

  /**
   * Generate ALTER TABLE statements for column additions.
   * Used for schema evolution.
   */
  public generateAlterAddColumn(
    context: ContextBundle,
    plan: ExecutionPlan,
    columnName: string,
  ): string {
    let platform = plan.platform || context.dataset.platform || 'unknown';

    // Resolve HDFS to Hive SQL
    if (platform.toLowerCase() === 'hdfs') {
      platform = 'hive';
    }

    const tableName = context.dataset.name;

    logger.info(
      {
        event: 'alter_add_column_lookup',
        tableName,
        columnName,
        platform,
        availableFields: context.schema.map((f) => f.fieldPath),
      },
      `Looking for column ${columnName} in schema`,
    );

    // Find the column in the schema to get its type
    const field = context.schema.find((f) => f.fieldPath === columnName);
    if (!field) {
      logger.warn(
        {
          event: 'column_not_found_in_schema',
          tableName,
          columnName,
          availableFields: context.schema.map((f) => f.fieldPath),
        },
        `Column ${columnName} not found in schema for ${tableName}. Using documented default datatype VARCHAR(255)`,
      );

      // Create a synthetic field with documented default datatype for new columns
      const syntheticField = {
        fieldPath: columnName,
        type: 'VARCHAR(255)',
        nullable: true,
        tags: [],
        description: `New column ${columnName} (datatype not specified in request, using documented default VARCHAR(255))`,
      };

      logger.info(
        {
          event: 'using_synthetic_field',
          columnName,
          defaultType: 'VARCHAR(255)',
          assumption: 'Documented default for missing datatype',
        },
        `Using synthetic field for ${columnName} with documented default`,
      );

      return this.ddl.generateAlterAddColumn(
        tableName,
        syntheticField,
        platform as any,
        plan.schemaName,
      );
    }

    logger.info(
      {
        event: 'column_found_in_schema',
        columnName,
        fieldType: field.type,
        fieldNullable: field.nullable,
      },
      `Found column ${columnName} with type ${field.type}`,
    );

    return this.ddl.generateAlterAddColumn(
      tableName,
      field,
      platform as any,
      plan.schemaName,
    );
  }

  /**
   * Generate ALTER TABLE statements for column drops.
   */
  public generateAlterDropColumn(
    context: ContextBundle,
    plan: ExecutionPlan,
    columnName: string,
  ): string {
    const platform = plan.platform || context.dataset.platform || 'unknown';
    const tableName = context.dataset.name;

    return this.ddl.generateAlterDropColumn(
      tableName,
      columnName,
      platform as any,
      plan.schemaName,
    );
  }
}
