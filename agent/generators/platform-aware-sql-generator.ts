import { ExecutionPlan } from '../planner/types.js';
import { ContextBundle } from '../context/type.js';
import { DDLGenerator, DDLGenerationOptions } from './ddl-generator.js';
import { SQLValidator } from './sql-validator.js';
import { DDLArtifact } from './types.js';
import { logger } from '../config/logger.js';

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

      // Determine operation type from execution plan
      // CRITICAL: Always trust planner's explicit type over detection
      let operationType = 'create_table'; // Default fallback

      if (plan.requiredChanges && plan.requiredChanges.length > 0) {
        const firstChange = plan.requiredChanges[0];
        if (!firstChange) {
          logger.warn(
            { event: 'first_change_undefined' },
            'First change is undefined, defaulting to create_table',
          );
          operationType = 'create_table';
        } else {
          const explicitType =
            firstChange.type?.toLowerCase().trim().replace(/\s+/g, '_') || '';

          logger.info(
            {
              event: 'planner_explicit_type',
              explicitType,
              fullChange: firstChange,
              originalType: firstChange.type,
            },
            `Planner's explicit type: ${explicitType}`,
          );

          // TRUST the planner's explicit type - this is the source of truth
          if (explicitType === 'add_column') {
            operationType = 'add_column';
            logger.info(
              { event: 'using_planner_add_column' },
              `Using planner's explicit add_column type`,
            );
          } else if (explicitType === 'drop_column') {
            operationType = 'drop_column';
            logger.info(
              { event: 'using_planner_drop_column' },
              `Using planner's explicit drop_column type`,
            );
          } else if (explicitType === 'create_table') {
            operationType = 'create_table';
            logger.info(
              { event: 'using_planner_create_table' },
              `Using planner's explicit create_table type`,
            );
          } else {
            // Fallback to detection if planner type is unknown
            operationType = this.determineOperationType(plan);
            logger.warn(
              {
                event: 'unknown_planner_type_fallback',
                explicitType,
                detectedType: operationType,
              },
              `Unknown planner type '${explicitType}', falling back to detection: ${operationType}`,
            );
          }
        }
      } else {
        // No required changes, fallback to detection
        operationType = this.determineOperationType(plan);
        logger.warn(
          {
            event: 'no_required_changes_fallback',
            detectedType: operationType,
          },
          `No required changes, using detected type: ${operationType}`,
        );
      }

      logger.info(
        {
          event: 'final_operation_type',
          operationType,
          planActions: plan.requiredChanges,
          actualSchemaFields: context.schema?.length || 0,
          actualSchemaSample:
            context.schema?.slice(0, 3).map((f) => f.fieldPath) || [],
          affectedColumns: plan.affectedColumns,
          planSummary: plan.summary,
          planIntent: plan.intent,
        },
        `Final operation type: ${operationType}`,
      );

      const finalOperationType = operationType;

      let ddlStatement: string;
      let fieldCount: number;

      // Generate DDL based on operation type
      switch (finalOperationType) {
        case 'add_column':
          // Generate ALTER TABLE ADD COLUMN statements
          const columnNames = this.extractColumnNames(plan);
          logger.info(
            {
              event: 'generating_add_column',
              columnNames,
              schemaFields: context.schema.map((f) => f.fieldPath),
              operationType: finalOperationType,
              affectedColumns: plan.affectedColumns,
            },
            `Generating ADD COLUMN for: ${columnNames.join(', ')}`,
          );

          if (columnNames.length === 0) {
            logger.error(
              {
                event: 'no_columns_for_add_column',
                plan,
                affectedColumns: plan.affectedColumns,
                requiredChanges: plan.requiredChanges,
              },
              `No columns found for ADD COLUMN operation - affectedColumns is empty`,
            );
            throw new Error(
              'ADD COLUMN operation requires affectedColumns in plan',
            );
          }

          logger.info(
            {
              event: 'generating_alter_statements',
              columnCount: columnNames.length,
            },
            `Generating ${columnNames.length} ALTER TABLE statements`,
          );

          const alterStatements = columnNames.map((columnName) =>
            this.generateAlterAddColumn(context, plan, columnName),
          );
          ddlStatement = alterStatements.join('\n\n');
          fieldCount = columnNames.length;
          logger.info(
            {
              event: 'alter_statements_generated',
              statementCount: alterStatements.length,
              firstStatement: alterStatements[0]?.substring(0, 100),
            },
            `Generated ${alterStatements.length} ALTER statements`,
          );
          break;

        case 'drop_column':
          // Generate ALTER TABLE DROP COLUMN statements
          const dropColumnNames = this.extractColumnNames(plan);
          logger.info(
            {
              event: 'generating_drop_column',
              columnNames: dropColumnNames,
            },
            `Generating DROP COLUMN for: ${dropColumnNames.join(', ')}`,
          );

          const dropStatements = dropColumnNames.map((columnName) =>
            this.generateAlterDropColumn(context, plan, columnName),
          );
          ddlStatement = dropStatements.join('\n\n');
          fieldCount = dropColumnNames.length;
          break;

        case 'create_table':
          // Generate CREATE TABLE statement
          logger.info(
            {
              event: 'generating_create_table',
              schemaFields: context.schema.map((f) => f.fieldPath),
            },
            `Generating CREATE TABLE with ${context.schema.length} fields`,
          );

          const options: DDLGenerationOptions = {
            platform: platform as any,
            tableName,
            ifNotExists: true,
            validationStatus: 'generated',
            ...(schemaName && { schemaName }),
          };
          const createArtifact = this.ddl.generate(context.schema, options);
          ddlStatement = createArtifact.ddl;
          fieldCount = createArtifact.fieldCount;
          break;

        default:
          // Unknown operation type - this should not happen
          logger.error(
            {
              event: 'unknown_operation_type_in_switch',
              operationType: finalOperationType,
              plan,
            },
            `Unknown operation type '${finalOperationType}' in switch statement - defaulting to CREATE TABLE`,
          );

          const defaultOptions: DDLGenerationOptions = {
            platform: platform as any,
            tableName,
            ifNotExists: true,
            validationStatus: 'generated',
            ...(schemaName && { schemaName }),
          };
          const defaultArtifact = this.ddl.generate(
            context.schema,
            defaultOptions,
          );
          ddlStatement = defaultArtifact.ddl;
          fieldCount = defaultArtifact.fieldCount;
          break;
      }

      // Create artifact
      let artifact: DDLArtifact = {
        ddl: ddlStatement,
        platform: platform as any,
        tableName,
        operationType: finalOperationType,
        validationStatus: 'generated',
        fieldCount,
        notes: [
          `Generated ${finalOperationType.toUpperCase()} DDL for ${platform.toUpperCase()}`,
          `Affected columns: ${plan.affectedColumns.join(', ')}`,
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
        finalOperationType,
        plan.affectedColumns,
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
          operationType,
          durationMs: performance.now() - startTime,
        },
        `✓ Platform-aware SQL Generated (${artifact.platform}, ${operationType})`,
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
   * Enforce operation type consistency based on context.
   * If the schema has existing fields and we're adding columns, force ADD COLUMN.
   * If the schema is empty or doesn't exist, use CREATE TABLE.
   */
  private enforceOperationTypeConsistency(
    detectedType: string,
    plan: ExecutionPlan,
    context: ContextBundle,
  ): string {
    // Always trust the planner's explicit operation type if it's set correctly
    if (plan.requiredChanges && plan.requiredChanges.length > 0) {
      const firstChange = plan.requiredChanges[0];
      if (!firstChange) {
        return detectedType;
      }
      const explicitType =
        firstChange.type?.toLowerCase().trim().replace(/\s+/g, '_') || '';

      if (explicitType === 'add_column') {
        logger.info(
          {
            event: 'using_explicit_planner_type',
            explicitType,
          },
          `Using planner's explicit type: add_column`,
        );
        return 'add_column';
      }

      if (explicitType === 'drop_column') {
        logger.info(
          {
            event: 'using_explicit_planner_type',
            explicitType,
          },
          `Using planner's explicit type: drop_column`,
        );
        return 'drop_column';
      }

      if (explicitType === 'create_table') {
        logger.info(
          {
            event: 'using_explicit_planner_type',
            explicitType,
          },
          `Using planner's explicit type: create_table`,
        );
        return 'create_table';
      }
    }

    // If we have existing schema fields, it's likely an ALTER operation
    if (context.schema && context.schema.length > 0) {
      const detectedLower = detectedType
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_');

      // If the plan explicitly says "add_column" or similar, trust it
      if (
        detectedLower === 'add_column' ||
        (detectedLower.includes('add') && detectedLower.includes('column'))
      ) {
        return 'add_column';
      }

      // If plan says "create_table" but we have existing schema, this is likely wrong
      if (detectedLower === 'create_table' && plan.affectedColumns.length > 0) {
        logger.warn(
          {
            event: 'conflicting_operation_type',
            detected: detectedType,
            existingSchemaFields: context.schema.length,
            affectedColumns: plan.affectedColumns,
          },
          `Detected CREATE TABLE but existing schema has ${context.schema.length} fields - forcing ADD COLUMN`,
        );
        return 'add_column';
      }
    }

    // If no existing schema, CREATE TABLE is appropriate
    if (!context.schema || context.schema.length === 0) {
      return 'create_table';
    }

    return detectedType;
  }

  /**
   * Determine the operation type from the execution plan.
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
