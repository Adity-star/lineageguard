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
   * @returns DDLArtifact with platform-specific CREATE TABLE statement
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

      // Build DDL generation options
      const options: DDLGenerationOptions = {
        platform,
        tableName,
        schemaName,
        ifNotExists: true,
        validationStatus: "generated", // Will update after validation
      };

      // Generate platform-specific DDL
      let artifact = this.ddl.generate(context.schema, options);

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
          durationMs: performance.now() - startTime,
        },
        `✓ Platform-aware SQL Generated (${artifact.platform})`
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

    // Find the column in the schema to get its type
    const field = context.schema.find((f) => f.fieldPath === columnName);
    if (!field) {
      logger.warn(
        {
          event: "column_not_found_in_schema",
          tableName,
          columnName,
        },
        `Column ${columnName} not found in schema for ${tableName}`
      );
      return `-- Column ${columnName} not found in schema`;
    }

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
