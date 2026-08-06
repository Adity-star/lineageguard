import { logger } from "../config/logger.js";

/**
 * SQL validation result with details about any parsing issues.
 */
export interface SQLValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  statement?: string;
  platform?: string;
}

/**
 * Simple SQL DDL validator using regex parsing.
 *
 * Validates:
 * - Basic CREATE TABLE syntax
 * - Column definitions
 * - Platform-specific syntax
 * - Common SQL errors
 *
 * Not a full SQL parser but sufficient for basic DDL validation.
 * For production, consider using a real SQL parser library or
 * executing against a test database.
 */
export class SQLValidator {
  /**
   * Validate a DDL statement for basic correctness.
   */
  public validate(
    ddl: string,
    platform?: string
  ): SQLValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Trim and normalize
      const statement = ddl.trim();

      if (!statement) {
        errors.push("DDL statement is empty");
        return { valid: false, errors, warnings, statement, platform };
      }

      // Check for CREATE TABLE
      if (!statement.toUpperCase().includes("CREATE TABLE")) {
        errors.push(
          "Statement does not contain CREATE TABLE - expected DDL to start with CREATE TABLE"
        );
      }

      // Check for balanced parentheses
      const openParen = (statement.match(/\(/g) || []).length;
      const closeParen = (statement.match(/\)/g) || []).length;
      if (openParen !== closeParen) {
        errors.push(
          `Unbalanced parentheses: ${openParen} open, ${closeParen} close`
        );
      }

      // Check for semicolon at end (optional but good practice)
      if (!statement.endsWith(";")) {
        warnings.push("DDL statement should end with semicolon (;)");
      }

      // Check for quoted identifiers based on platform
      this.validateIdentifiers(statement, platform, errors, warnings);

      // Check for data types
      this.validateDataTypes(statement, platform, errors);

      // Platform-specific syntax checks
      this.validatePlatformSyntax(statement, platform, errors, warnings);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        statement,
        platform,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`Validation failed with error: ${msg}`);
      return { valid: false, errors, warnings, statement: ddl, platform };
    }
  }

  /**
   * Validate identifier quoting matches the platform.
   */
  private validateIdentifiers(
    statement: string,
    platform: string | undefined,
    errors: string[],
    warnings: string[]
  ): void {
    if (platform === "bigquery") {
      // BigQuery should use backticks
      if (statement.includes('"') && !statement.includes("`")) {
        warnings.push(
          'BigQuery typically uses backticks (`) for identifiers, not double quotes (")'
        );
      }
    } else if (platform === "tsql") {
      // SQL Server should use square brackets or double quotes
      if (statement.includes("`")) {
        warnings.push(
          "SQL Server (T-SQL) should not use backticks (`). Use square brackets [..] or double quotes instead."
        );
      }
    } else {
      // Postgres, MySQL, Snowflake typically use double quotes
      if (
        statement.includes("[") &&
        !statement.includes("`") &&
        platform !== "tsql"
      ) {
        warnings.push(
          "Standard SQL uses double quotes or backticks for identifiers, not square brackets"
        );
      }
    }
  }

  /**
   * Validate that data types are recognizable.
   */
  private validateDataTypes(
    statement: string,
    platform: string | undefined,
    errors: string[]
  ): void {
    // Extract column definitions (simplified regex)
    const columnPattern =
      /(?:"`?\w+"`?|"\w+"|`\w+`|\[\w+\])\s+(\w+(?:\([^)]*\))?)/gi;

    const dataTypes: string[] = [];
    let match;

    while ((match = columnPattern.exec(statement)) !== null) {
      dataTypes.push(match[1]);
    }

    // Check for obviously invalid types
    const commonTypes = [
      "INT",
      "BIGINT",
      "VARCHAR",
      "TEXT",
      "BOOLEAN",
      "TIMESTAMP",
      "DATE",
      "DECIMAL",
      "FLOAT",
      "DOUBLE",
      "STRING", // BigQuery
      "NUMERIC", // BigQuery
      "INT64", // BigQuery
      "BOOL", // BigQuery
      "DATETIME2", // T-SQL
      "BIT", // T-SQL
      "NVARCHAR", // T-SQL
      "REAL", // Redshift, Postgres
      "SERIAL", // Postgres
      "SMALLINT",
      "TINYINT",
      "MEDIUMINT",
      "LONGTEXT",
      "MEDIUMTEXT",
      "BLOB",
      "LONGBLOB",
      "ENUM",
      "JSON",
      "JSONB",
      "ARRAY",
      "INTERVAL",
    ];

    const commonTypeUpper = commonTypes.map((t) => t.toUpperCase());

    for (const type of dataTypes) {
      const typeUpper = type.toUpperCase().split("(")[0]; // Remove size spec like VARCHAR(255)
      if (
        typeUpper &&
        !commonTypeUpper.includes(typeUpper) &&
        typeUpper.length > 2
      ) {
        // Only warn on substantial-looking types
        if (!typeUpper.match(/^\d+/)) {
          // Skip if starts with number
          logger.warn(
            {
              event: "sql_validator_unknown_type",
              type: typeUpper,
              platform,
            },
            `Unknown or uncommon data type: ${typeUpper}`
          );
        }
      }
    }
  }

  /**
   * Validate platform-specific SQL syntax.
   */
  private validatePlatformSyntax(
    statement: string,
    platform: string | undefined,
    errors: string[],
    warnings: string[]
  ): void {
    if (!platform) return;

    const upper = statement.toUpperCase();

    switch (platform.toLowerCase()) {
      case "bigquery":
        // BigQuery doesn't support IF NOT EXISTS in some contexts
        if (upper.includes("IF NOT EXISTS")) {
          // Actually it does support it, but warn about table naming
          warnings.push(
            "BigQuery requires project.dataset.table naming - verify table reference is correct"
          );
        }
        break;

      case "snowflake":
        // Snowflake is quite standard
        if (upper.includes("CASCADE")) {
          warnings.push(
            "Snowflake CASCADE syntax may differ - review before applying"
          );
        }
        break;

      case "postgres":
      case "postgresql":
        // Postgres-specific warnings
        if (upper.includes("INT UNSIGNED")) {
          errors.push(
            "PostgreSQL does not support UNSIGNED - use SERIAL or BIGINT instead"
          );
        }
        break;

      case "mysql":
        // MySQL-specific checks
        if (upper.includes("BOOLEAN")) {
          warnings.push("MySQL BOOLEAN is an alias for TINYINT(1)");
        }
        break;

      case "tsql":
        // SQL Server checks
        if (upper.includes("AUTO_INCREMENT")) {
          errors.push(
            "SQL Server uses IDENTITY instead of AUTO_INCREMENT - syntax error"
          );
        }
        break;

      case "redshift":
        // Redshift checks
        if (upper.includes("GENERATED")) {
          warnings.push(
            "Redshift does not support GENERATED columns - use default values instead"
          );
        }
        break;
    }
  }

  /**
   * Validate multiple DDL statements (like migration files).
   */
  public validateBatch(
    ddlStatements: string[],
    platform?: string
  ): SQLValidationResult[] {
    return ddlStatements.map((stmt) => this.validate(stmt, platform));
  }

  /**
   * Extract CREATE TABLE name from DDL.
   */
  public extractTableName(ddl: string): string | null {
    const match = ddl.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"`\[]?(\w+)[`"`\]]?/i);
    return match ? match[1] : null;
  }

  /**
   * Extract column names from DDL.
   */
  public extractColumnNames(ddl: string): string[] {
    const columns: string[] = [];

    // Match quoted or unquoted column names followed by type
    const pattern = /(?:`[^`]+`|"[^"]+"|`[^\]`]+`|\[\w+\]|\w+)\s+(?:INT|VARCHAR|TEXT|BOOLEAN|TIMESTAMP|DATE|DECIMAL|FLOAT|DOUBLE|STRING|INT64|BOOL|DATETIME2|BIT|NVARCHAR|REAL|SERIAL|SMALLINT|TINYINT|MEDIUMINT|LONGTEXT|BLOB|ENUM|JSON)/gi;

    let match;
    while ((match = pattern.exec(ddl)) !== null) {
      let colName = match[0].split(/\s+/)[0]; // Get first part (column name)
      // Remove quotes/brackets
      colName = colName.replace(/[`"\[\]]/g, "");
      if (colName && colName.length > 0) {
        columns.push(colName);
      }
    }

    return [...new Set(columns)]; // Deduplicate
  }
}
