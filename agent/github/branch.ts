import { ExecutionPlan } from "../planner/types.js";
import { logger } from "../config/logger.js";

export class BranchBuilder {

  build(
    plan: any
  ): string {

    const executionPlan = plan.plan || plan;
    const intent = executionPlan.intent || executionPlan.summary || "schema-change";
    const affectedDataset = executionPlan.affectedDataset || executionPlan.summary?.split(" ").pop() || "dataset";

    const operation =
      intent
        .replace(/_/g, "-")
        .replace(/\s+/g, "-")
        .toLowerCase();

    const dataset =
      affectedDataset
        .replace(/\./g, "-")
        .replace(/_/g, "-")
        .toLowerCase();

    return `${operation}/${dataset}`;

  }

}