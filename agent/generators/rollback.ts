import { ExecutionPlan } from "../planner/types.js";
import { logger } from "../config/logger.js";

import { RollbackArtifact } from "./types.js";

export class RollbackGenerator {
  generate(
    plan: ExecutionPlan
  ): RollbackArtifact {

    logger.info({
      event: "rollback_generation_start",
      requiredChanges: plan.requiredChanges,
      affectedColumns: plan.affectedColumns,
    }, "Generating rollback SQL");

    if (!plan.requiredChanges || plan.requiredChanges.length === 0) {
      return {
        automatic: false,
        sql: "-- No changes to rollback.",
      };
    }

    const operationType = this.determineOperationType(plan);
    
    logger.info({
      event: "rollback_operation_type",
      operationType,
    }, `Rollback operation type: ${operationType}`);

    const statements = plan.requiredChanges.map(change => {
      const changeType = change.type?.toLowerCase().trim().replace(/\s+/g, "_") || "";

      if (changeType === "add_column" || (changeType.includes("add") && changeType.includes("column"))) {
        // For ADD COLUMN, rollback is DROP COLUMN
        // Use affectedColumns from plan if available
        if (plan.affectedColumns && plan.affectedColumns.length > 0) {
          logger.info({
            event: "rollback_using_affected_columns",
            affectedColumns: plan.affectedColumns,
          }, `Using affectedColumns for rollback: ${plan.affectedColumns.join(", ")}`);
          return plan.affectedColumns.map(columnName =>
            `ALTER TABLE ${plan.affectedDataset || '<table>'} DROP COLUMN ${columnName};`
          ).join("\n");
        }
        // Fallback to extracting from description
        const columnName = this.extractColumnName(change);
        if (columnName) {
          logger.info({
            event: "rollback_using_extracted_column",
            columnName,
          }, `Using extracted column for rollback: ${columnName}`);
          return `ALTER TABLE ${plan.affectedDataset || '<table>'} DROP COLUMN ${columnName};`;
        }
      }

      if (changeType === "drop_column" || (changeType.includes("drop") && changeType.includes("column"))) {
        // For DROP COLUMN, rollback is ADD COLUMN (but we need original schema)
        const columnName = this.extractColumnName(change);
        if (columnName) {
          return `-- Manual rollback required: Restore column ${columnName} from backup`;
        }
      }

      if (changeType === "rename_column" || (changeType.includes("rename") && changeType.includes("column"))) {
        // For RENAME COLUMN, rollback is reverse rename
        const parts = change.description.match(/Rename (.+) to (.+)/i);
        if (parts) {
          return `ALTER TABLE ${plan.affectedDataset || '<table>'} RENAME COLUMN ${parts[2]} TO ${parts[1]};`;
        }
      }

      return "-- Manual rollback required for this change type.";
    });

    const sql = statements.filter(s => !s.startsWith("--")).length > 0
      ? statements.join("\n")
      : statements.join("\n");

    const automatic = statements.filter(s => !s.startsWith("--")).length > 0;

    logger.info({
      event: "rollback_generation_complete",
      automatic,
      statementCount: statements.length,
    }, `Rollback SQL generated: ${automatic ? 'automatic' : 'manual'}`);

    return {
      automatic,
      sql,
    };
  }

  private determineOperationType(plan: ExecutionPlan): string {
    if (!plan.requiredChanges || plan.requiredChanges.length === 0) {
      return "unknown";
    }

    const firstChange = plan.requiredChanges[0];
    const changeType = firstChange.type?.toLowerCase().trim().replace(/\s+/g, "_") || "";

    if (changeType.includes("add") && changeType.includes("column")) {
      return "add_column";
    }
    if (changeType.includes("drop") && changeType.includes("column")) {
      return "drop_column";
    }
    if (changeType.includes("rename") && changeType.includes("column")) {
      return "rename_column";
    }

    return "unknown";
  }

  private extractColumnName(change: any): string | null {
    // Try to extract column name from description
    const description = change.description || "";
    
    // Match patterns like "Add column Customerbalance_1" or "Drop column Customerbalance_1"
    const match = description.match(/(?:add|drop|rename)\s+(?:column\s+)?(\w+)/i);
    if (match) {
      return match[1];
    }
    
    // Also check affectedColumns in the plan
    if (change.columnName) {
      return change.columnName;
    }
    
    return null;
  }
}