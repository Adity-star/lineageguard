import { ExecutionPlan } from "../planner/types.js";
import { ContextBundle } from "../context/type.js";
import { DDLGenerator, DDLGenerationOptions } from "./ddl-generator.js";
import { SQLValidator } from "./sql-validator.js";
import { DDLArtifact } from "./types.js";
import { logger } from "../config/logger.js";

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
    plan: ExecutionPlan
  ): Promise<DDLArtifact> {
    const startTime = performance.now();

    try {
      logger.info(
        {
          event: "platform_aware_sql_generation_start",
          datasetName: context.dataset.name,
          platform: plan.platform || context.dataset.platform,
          fieldCount: context.schema.length,
          planActions: plan.requiredChanges?.length || 0,
        },
        `PlatformAwareSQLGenerator starting for ${context.dataset.name}`
      );

      // Extract platform from plan or context
      const platform =
        plan.platform || context.dataset.platform || "unknown";
      const tableName = context.dataset.name;
      const schemaName = plan.schemaName;

      // Validate we have schema fields
      if (!context.schema || context.schema.length === 0) {
        throw new Error(
          `No schema fields available for ${tableName}. Cannot generate DDL.`
        );
      }

      // Determine operation type from execution plan
      const operationType = this.determineOperationType(plan);
      
      logger.info({
        event: "operation_type_determined",
        operationType,
        planActions: plan.requiredChanges,
        actualSchemaFields: context.schema?.length || 0,
        actualSchemaSample: context.schema?.slice(0, 3).map(f => f.fieldPath) || [],
      }, `Determined operation type: ${operationType}`);

      let ddlStatement: string;
      let fieldCount: number;

      // Generate DDL based on operation type
      switch (operationType) {
        case "add_column":
          // Generate ALTER TABLE ADD COLUMN statements
          const columnNames = this.extractColumnNames(plan);
          logger.info({
            event: "generating_add_column",
            columnNames,
            schemaFields: context.schema.map(f => f.fieldPath),
          }, `Generating ADD COLUMN for: ${columnNames.join(", ")}`);
          
          const alterStatements = columnNames.map(columnName => 
            this.generateAlterAddColumn(context, plan, columnName)
          );
          ddlStatement = alterStatements.join("\n\n");
          fieldCount = columnNames.length;
          break;

        case "drop_column":
          // Generate ALTER TABLE DROP COLUMN statements
          const dropColumnNames = this.extractColumnNames(plan);
          logger.info({
            event: "generating_drop_column",
            columnNames: dropColumnNames,
          }, `Generating DROP COLUMN for: ${dropColumnNames.join(", ")}`);
          
          const dropStatements = dropColumnNames.map(columnName =>
            this.generateAlterDropColumn(context, plan, columnName)
          );
          ddlStatement = dropStatements.join("\n\n");
          fieldCount = dropColumnNames.length;
          break;

        case "create_table":
        default:
          // Generate CREATE TABLE statement
          logger.info({
            event: "generating_create_table",
            schemaFields: context.schema.map(f => f.fieldPath),
          }, `Generating CREATE TABLE with ${context.schema.length} fields`);
          
          const options: DDLGenerationOptions = {
            platform,
            tableName,
            schemaName,
            ifNotExists: true,
            validationStatus: "generated",
          };
          const createArtifact = this.ddl.generate(context.schema, options);
          ddlStatement = createArtifact.ddl;
          fieldCount = createArtifact.fieldCount;
          break;
      }

      // Create artifact
      const artifact: DDLArtifact = {
        ddl: ddlStatement,
        formatted: ddlStatement,
        platform: platform as any,
        tableName,
        operationType,
        validationStatus: "generated",
        fieldCount,
        notes: [
          `Generated ${operationType} DDL for ${platform.toUpperCase()}`,
          `Affected columns: ${plan.affectedColumns.join(", ")}`,
        ],
      };

      // Validate the generated DDL
      const validationResult = this.validator.validate(
        artifact.ddl,
        artifact.platform
      );

      // Update artifact with validation results
      if (validationResult.valid) {
        artifact = {
          ...artifact,
          validationStatus: "validated",
          notes: [
            ...(artifact.notes || []),
            `✓ DDL validated for ${artifact.platform.toUpperCase()}`,
          ],
        };

        logger.info(
          {
            event: "platform_aware_sql_validation_passed",
            platform: artifact.platform,
            tableName: artifact.tableName,
            warnings: validationResult.warnings.length,
          },
          `✓ DDL validation passed`
        );
      } else {
        // Mark as unvalidated with errors
        artifact = {
          ...artifact,
          validationStatus: "unvalidated",
          validationErrors: validationResult.errors,
          notes: [
            ...(artifact.notes || []),
            `⚠ DDL validation found ${validationResult.errors.length} error(s)`,
          ],
        };

        logger.warn(
          {
            event: "platform_aware_sql_validation_failed",
            platform: artifact.platform,
            tableName: artifact.tableName,
            errors: validationResult.errors,
            warnings: validationResult.warnings,
          },
          `⚠ DDL validation found errors - review before applying`
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
          event: "platform_aware_sql_generation_success",
          platform: artifact.platform,
          tableName: artifact.tableName,
          fieldCount: artifact.fieldCount,
          validationStatus: artifact.validationStatus,
          operationType,
          durationMs: performance.now() - startTime,
        },
        `✓ Platform-aware SQL Generated (${artifact.platform}, ${operationType})`
      );

      return artifact;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(
        {
          event: "platform_aware_sql_generation_failed",
          platform: plan.platform || context.dataset.platform,
          datasetName: context.dataset.name,
          error: errorMessage,
          durationMs: performance.now() - startTime,
        },
        `PlatformAwareSQLGenerator failed: ${errorMessage}`
      );

      throw error;
    }
  }

  /**
   * Determine the operation type from the execution plan.
   */
  private determineOperationType(plan: ExecutionPlan): string {
    if (!plan.requiredChanges || plan.requiredChanges.length === 0) {
      return "create_table"; // Default to CREATE TABLE
    }

    const firstChange = plan.requiredChanges[0];
    const changeType = firstChange.type?.toLowerCase() || "";

    if (changeType.includes("add") && changeType.includes("column")) {
      return "add_column";
    }
    if (changeType.includes("drop") && changeType.includes("column")) {
      return "drop_column";
    }
    if (changeType.includes("create") && changeType.includes("table")) {
      return "create_table";
    }

    // Default to CREATE TABLE for unknown operations
    logger.warn({
      event: "unknown_operation_type",
      changeType,
    }, `Unknown operation type, defaulting to create_table`);
    return "create_table";
  }

  /**
   * Extract column names from the execution plan.
   */
  private extractColumnNames(plan: ExecutionPlan): string[] {
    return plan.affectedColumns || [];
  }

  /**
   * Generate ALTER TABLE statements for column additions.
   * Used for schema evolution.
   */
  public generateAlterAddColumn(
    context: ContextBundle,
    plan: ExecutionPlan,
    columnName: string
  ): string {
    const platform = plan.platform || context.dataset.platform || "unknown";
    const tableName = context.dataset.name;

    logger.info({
      event: "alter_add_column_lookup",
      tableName,
      columnName,
      availableFields: context.schema.map(f => f.fieldPath),
    }, `Looking for column ${columnName} in schema`);

    // Find the column in the schema to get its type
    const field = context.schema.find((f) => f.fieldPath === columnName);
    if (!field) {
      logger.warn(
        {
          event: "column_not_found_in_schema",
          tableName,
          columnName,
          availableFields: context.schema.map(f => f.fieldPath),
        },
        `Column ${columnName} not found in schema for ${tableName}. Available fields: ${context.schema.map(f => f.fieldPath).join(", ")}`
      );
      return `-- Column ${columnName} not found in schema. Available fields: ${context.schema.map(f => f.fieldPath).join(", ")}`;
    }

    logger.info({
      event: "column_found_in_schema",
      columnName,
      fieldType: field.type,
      fieldNullable: field.nullable,
    }, `Found column ${columnName} with type ${field.type}`);

    return this.ddl.generateAlterAddColumn(
      tableName,
      field,
      platform as any,
      plan.schemaName
    );
  }

  /**
   * Generate ALTER TABLE statements for column drops.
   */
  public generateAlterDropColumn(
    context: ContextBundle,
    plan: ExecutionPlan,
    columnName: string
  ): string {
    const platform = plan.platform || context.dataset.platform || "unknown";
    const tableName = context.dataset.name;

    return this.ddl.generateAlterDropColumn(
      tableName,
      columnName,
      platform as any,
      plan.schemaName
    );
  }
}
