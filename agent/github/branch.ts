import { ExecutionPlan } from "../planner/types.js";
import { logger } from "../config/logger.js";

export class BranchBuilder {

  build(
    plan: ExecutionPlan
  ): string {

    const operation =
      plan.intent
        .replace(/_/g, "-")
        .toLowerCase();

    const dataset =
      plan.affectedDataset
        .replace(/\./g, "-")
        .replace(/_/g, "-")
        .toLowerCase();

    return `${operation}/${dataset}`;

  }

}