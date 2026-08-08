import { SchemaField } from "../mcp/types.js";
import { logger } from "../config/logger.js";

/**
 * Supported database platforms for DDL generation.
 */
export type DatabasePlatform =
  | "snowflake"
  | "postgres"
  | "postgresql"
  | "bigquery"
  | "mysql"
  | "redshift"
  | "tsql"
  | "unknown";

/**
 * DDL generation options and validation status.
 */
export interface DDLGenerationOptions {
  platform: DatabasePlatform;
  tableName: string;
  schemaName?: string;
  ifNotExists?: boolean;
  validated?: boolean;
  validationStatus?: "validated" | "generated" | "unvalidated";
}

/**
 * Result of DDL generation with metadata.
 */
export interface DDLArtifact {
  /** The actual DDL statement(s) */
  ddl: string;

  /** Formatted version with comments and metadata */
  formatted: string;

  /** Platform this DDL targets */
  platform: DatabasePlatform;

  /** Table name generated for */
  tableName: string;

  /** Validation status: "validated" if tested, "generated" if unvalidated */
  validationStatus: "validated" | "generated" | "unvalidated";

  /** Validation error details if applicable */
  validationErrors?: string[];

  /** Field count in generated schema */
  fieldCount: number;

  /** Platform-specific notes or warnings */
  notes?: string[];
}

/**
 * Platform-aware DDL generator.
 *
 * Generates CREATE TABLE statements targeting the actual database platform
 * specified in the DataHub dataset metadata, not assuming Postgres/Prisma.
 *
 * Supports: Snowflake, PostgreSQL, BigQuery, MySQL, Redshift, SQL Server
 */
export class DDLGenerator {
  /**
   * Normalize a platform name to a supported value.
   */
  private normalizePlatform(platform: string): DatabasePlatform {
    const lower = (platform || "unknown").toLowerCase().trim();

    // Exact matches
    if (lower === "snowflake") return "snowflake";
    if (lower === "bigquery") return "bigquery";
    if (lower === "postgres" || lower === "postgresql") return "postgres";
    if (lower === "mysql") return "mysql";
    if (lower === "redshift") return "redshift";
    if (lower === "tsql" || lower === "mssql" || lower === "sqlserver")
      return "tsql";

    // HDFS/Hive/Spark SQL platforms - map to Hive SQL (similar syntax)
    if (lower === "hdfs") {
      logger.warn({
        event: "hdfs_platform_resolved",
        original: platform,
        resolved: "hive",
      }, `HDFS platform resolved to Hive SQL for DDL generation`);
      return "postgres"; // Use Hive/Postgres-like syntax as fallback
    }
    if (lower === "hive" || lower === "spark" ||
        lower === "sparksql" || lower === "impala" || lower === "trino" ||
        lower === "iceberg" || lower === "delta") {
      return "postgres"; // Use Hive/Postgres-like syntax as fallback
    }

    // Fallback to unknown
    logger.warn({
      event: "unknown_platform",
      platform,
    }, `Unknown platform '${platform}' defaulting to unknown`);
    return "unknown";
  }

  /**
   * Map SchemaField types to platform-specific DDL types.
   */
  private mapFieldType(
    fieldType: string,
    platform: DatabasePlatform
  ): string {
    const normalized = (fieldType || "").toLowerCase().trim();

    // Common mapping
    const typeMap: Record<DatabasePlatform, Record<string, string>> = {
      snowflake: {
        int: "INTEGER",
        integer: "INTEGER",
        bigint: "BIGINT",
        varchar: "VARCHAR",
        string: "VARCHAR(256)",
        text: "VARCHAR(MAX)",
        boolean: "BOOLEAN",
        bool: "BOOLEAN",
        timestamp: "TIMESTAMP_NTZ",
        datetime: "TIMESTAMP_NTZ",
        date: "DATE",
        decimal: "DECIMAL(38,0)",
        numeric: "NUMERIC(38,0)",
        float: "FLOAT",
        double: "DOUBLE",
      },
      postgres: {
        int: "INTEGER",
        integer: "INTEGER",
        bigint: "BIGINT",
        varchar: "VARCHAR",
        string: "VARCHAR(255)",
        text: "TEXT",
        boolean: "BOOLEAN",
        bool: "BOOLEAN",
        timestamp: "TIMESTAMP",
        datetime: "TIMESTAMP",
        date: "DATE",
        decimal: "DECIMAL",
        numeric: "NUMERIC",
        float: "REAL",
        double: "DOUBLE PRECISION",
      },
      bigquery: {
        int: "INT64",
        integer: "INT64",
        bigint: "INT64",
        varchar: "STRING",
        string: "STRING",
        text: "STRING",
        boolean: "BOOL",
        bool: "BOOL",
        timestamp: "TIMESTAMP",
        datetime: "TIMESTAMP",
        date: "DATE",
        decimal: "NUMERIC",
        numeric: "NUMERIC",
        float: "FLOAT64",
        double: "FLOAT64",
      },
      mysql: {
        int: "INT",
        integer: "INT",
        bigint: "BIGINT",
        varchar: "VARCHAR(255)",
        string: "VARCHAR(255)",
        text: "LONGTEXT",
        boolean: "BOOLEAN",
        bool: "BOOLEAN",
        timestamp: "TIMESTAMP",
        datetime: "DATETIME",
        date: "DATE",
        decimal: "DECIMAL",
        numeric: "NUMERIC",
        float: "FLOAT",
        double: "DOUBLE",
      },
      redshift: {
        int: "INTEGER",
        integer: "INTEGER",
        bigint: "BIGINT",
        varchar: "VARCHAR",
        string: "VARCHAR(256)",
        text: "VARCHAR(MAX)",
        boolean: "BOOLEAN",
        bool: "BOOLEAN",
        timestamp: "TIMESTAMP",
        datetime: "TIMESTAMP",
        date: "DATE",
        decimal: "DECIMAL",
        numeric: "NUMERIC",
        float: "REAL",
        double: "DOUBLE PRECISION",
      },
      tsql: {
        int: "INT",
        integer: "INT",
        bigint: "BIGINT",
        varchar: "VARCHAR(255)",
        string: "VARCHAR(255)",
        text: "NVARCHAR(MAX)",
        boolean: "BIT",
        bool: "BIT",
        timestamp: "DATETIME2",
        datetime: "DATETIME2",
        date: "DATE",
        decimal: "DECIMAL",
        numeric: "NUMERIC",
        float: "FLOAT",
        double: "FLOAT",
      },
      unknown: {
        int: "INT",
        integer: "INTEGER",
        bigint: "BIGINT",
        varchar: "VARCHAR",
        string: "VARCHAR(255)",
        text: "TEXT",
        boolean: "BOOLEAN",
        bool: "BOOLEAN",
        timestamp: "TIMESTAMP",
        datetime: "TIMESTAMP",
        date: "DATE",
        decimal: "DECIMAL",
        numeric: "NUMERIC",
        float: "FLOAT",
        double: "DOUBLE",
      },
    };

    const platformMap = typeMap[platform] || typeMap["unknown"];
    return platformMap[normalized] || "VARCHAR(256)"; // Safe default
  }

  /**
   * Generate a nullable constraint string for the platform.
   */
  private getNullableConstraint(
    nullable: boolean,
    platform: DatabasePlatform
  ): string {
    // All platforms use NULL/NOT NULL the same way
    return nullable ? "NULL" : "NOT NULL";
  }

  /**
   * Build the CREATE TABLE statement for the given platform.
   */
  private buildCreateTableStatement(
    options: DDLGenerationOptions,
    fields: SchemaField[]
  ): string {
    const platform = options.platform;
    const tableName = this.quoteIdentifier(options.tableName, platform);
    const schemaQualified =
      options.schemaName && options.schemaName.trim()
        ? `${this.quoteIdentifier(options.schemaName, platform)}.${tableName}`
        : tableName;

    // Build column definitions
    const columnDefs = fields
      .map((field) => {
        const colName = this.quoteIdentifier(field.fieldPath, platform);
        const colType = this.mapFieldType(field.type, platform);
        const nullable = this.getNullableConstraint(field.nullable, platform);
        const comment = field.description
          ? ` -- ${field.description}`
          : "";

        return `  ${colName} ${colType} ${nullable}${comment}`;
      })
      .join("\n");

    const ifNotExistsClause = options.ifNotExists
      ? this.getIfNotExistsClause(platform)
      : "";

    const createStatement = `CREATE TABLE ${ifNotExistsClause} ${schemaQualified} (
${columnDefs}
);`;

    return createStatement;
  }

  /**
   * Get IF NOT EXISTS clause for each platform.
   * BigQuery and some others have different syntax.
   */
  private getIfNotExistsClause(platform: DatabasePlatform): string {
    // Most platforms use IF NOT EXISTS
    return "IF NOT EXISTS";
  }

  /**
   * Quote an identifier appropriately for the platform.
   */
  private quoteIdentifier(identifier: string, platform: DatabasePlatform): string {
    const cleaned = identifier.trim();

    if (platform === "bigquery") {
      // BigQuery uses backticks
      return `\`${cleaned}\``;
    } else if (platform === "tsql") {
      // SQL Server uses square brackets
      return `[${cleaned}]`;
    } else {
      // Snowflake, Postgres, MySQL, Redshift use double quotes
      return `"${cleaned}"`;
    }
  }

  /**
   * Generate platform-aware DDL from a schema.
   */
  public generate(
    fields: SchemaField[],
    options: DDLGenerationOptions
  ): DDLArtifact {
    const startTime = performance.now();
    const platform = this.normalizePlatform(options.platform);
    const validationStatus = options.validationStatus || "generated";

    logger.info(
      {
        event: "ddl_generation_start",
        platform,
        tableName: options.tableName,
        fieldCount: fields.length,
        validationStatus,
      },
      `DDLGenerator starting for platform: ${platform}, table: ${options.tableName}`
    );

    try {
      // Validate inputs
      if (!fields || fields.length === 0) {
        throw new Error("No schema fields provided for DDL generation");
      }

      if (!options.tableName || options.tableName.trim().length === 0) {
        throw new Error("Table name is required");
      }

      // Generate the DDL
      const ddl = this.buildCreateTableStatement(options, fields);

      // Build formatted version with metadata
      const platformLabel = platform === "unknown" ? "Generic SQL" : platform.toUpperCase();
      const formatted = [
        `-- =====================================`,
        `-- Generated by LineageGuard`,
        `-- Platform: ${platformLabel}`,
        `-- Table: ${options.tableName}`,
        `-- Fields: ${fields.length}`,
        `-- Validation Status: ${validationStatus}`,
        `-- Generated: ${new Date().toISOString()}`,
        `-- =====================================`,
        ``,
        ddl,
        ``,
      ].join("\n");

      const notes: string[] = [];

      // Platform-specific notes
      if (platform === "unknown") {
        notes.push(
          "Platform could not be determined from DataHub metadata. Using generic SQL - verify compatibility."
        );
      }

      if (validationStatus === "generated" || validationStatus === "unvalidated") {
        notes.push(
          "This DDL was generated and has NOT been executed. Review before applying to production."
        );
      }

      if (platform === "bigquery") {
        notes.push(
          "BigQuery uses project.dataset.table naming - adjust schema/table names as needed."
        );
      }

      logger.info(
        {
          event: "ddl_generation_success",
          platform,
          tableName: options.tableName,
          fieldCount: fields.length,
          ddlLength: ddl.length,
          durationMs: performance.now() - startTime,
          validationStatus,
        },
        `DDL generated successfully for ${options.tableName} (${fields.length} fields)`
      );

      return {
        ddl,
        formatted,
        platform,
        tableName: options.tableName,
        validationStatus,
        fieldCount: fields.length,
        notes,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(
        {
          event: "ddl_generation_failed",
          platform,
          tableName: options.tableName,
          error: errorMessage,
          durationMs: performance.now() - startTime,
        },
        `DDL generation failed: ${errorMessage}`
      );

      throw error;
    }
  }

  /**
   * Generate an ALTER TABLE statement for column additions (common use case).
   * Used for schema evolution scenarios.
   */
  public generateAlterAddColumn(
    tableName: string,
    field: SchemaField,
    platform: DatabasePlatform,
    schemaName?: string
  ): string {
    const normalizedPlatform = this.normalizePlatform(platform as string);
    const tableRef = schemaName
      ? `${this.quoteIdentifier(schemaName, normalizedPlatform)}.${this.quoteIdentifier(tableName, normalizedPlatform)}`
      : this.quoteIdentifier(tableName, normalizedPlatform);

    const colName = this.quoteIdentifier(field.fieldPath, normalizedPlatform);
    const colType = this.mapFieldType(field.type, normalizedPlatform);
    const nullable = this.getNullableConstraint(
      field.nullable,
      normalizedPlatform
    );

    return `ALTER TABLE ${tableRef} ADD COLUMN ${colName} ${colType} ${nullable};`;
  }

  /**
   * Generate a DROP COLUMN statement.
   * Platform-specific syntax for dropping columns.
   */
  public generateAlterDropColumn(
    tableName: string,
    columnName: string,
    platform: DatabasePlatform,
    schemaName?: string
  ): string {
    const normalizedPlatform = this.normalizePlatform(platform as string);
    const tableRef = schemaName
      ? `${this.quoteIdentifier(schemaName, normalizedPlatform)}.${this.quoteIdentifier(tableName, normalizedPlatform)}`
      : this.quoteIdentifier(tableName, normalizedPlatform);

    const colName = this.quoteIdentifier(columnName, normalizedPlatform);

    // BigQuery uses different syntax
    if (normalizedPlatform === "bigquery") {
      return `ALTER TABLE ${tableRef} DROP COLUMN ${colName};`;
    }

    // Most platforms use standard SQL
    return `ALTER TABLE ${tableRef} DROP COLUMN ${colName};`;
  }
}
