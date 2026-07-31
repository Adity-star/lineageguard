import { ExecutionPlan } from "../planner/types.js";

import { DbtArtifact } from "./types.js";

export class DbtGenerator {
  generate(
    plan: ExecutionPlan
  ): DbtArtifact | undefined {

    const files: string[] = [];

    for (const change of plan.requiredChanges) {

      switch (change.type) {

        case "rename_column":
          files.push("models/**/*.sql");
          files.push("models/**/*.yml");
          break;

        case "drop_column":
          files.push("models/**/*.sql");
          files.push("models/**/*.yml");
          break;

        case "add_column":
          files.push("models/**/*.yml");
          break;

        default:
          break;
      }

    }

    if (files.length === 0) {
      return undefined;
    }

    return {
      files: [...new Set(files)],
    };
  }
}