import { ExecutionPlan } from "@/planning";

import { RollbackArtifact } from "./types";

export class RollbackGenerator {
  generate(
    plan: ExecutionPlan
  ): RollbackArtifact {

    const automatic =
      plan.requiredChanges.every(change =>
        change.type === "rename_column"
      );

    if (!automatic) {
      return {
        automatic: false,
        sql:
`-- Manual rollback required.
-- Review migration before reverting.`,
      };
    }

    const statements = plan.requiredChanges.map(change => {
      const parts = change.description.match(
        /Rename (.+) to (.+)/i
      );

      if (!parts) {
        return "-- Manual rollback required.";
      }

      return `ALTER TABLE <table> RENAME COLUMN ${parts[2]} TO ${parts[1]};`;
    });

    return {
      automatic: true,
      sql: statements.join("\n"),
    };
  }
}