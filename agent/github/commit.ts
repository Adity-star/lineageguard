import { ExecutionPlan } from "@/planning";

export class CommitBuilder {

  build(
    plan: ExecutionPlan
  ): string {

    switch (plan.intent) {

      case "rename_column":

        return `Rename column in ${plan.affectedDataset}`;

      case "drop_column":

        return `Drop column from ${plan.affectedDataset}`;

      case "add_column":

        return `Add column to ${plan.affectedDataset}`;

      case "drop_table":

        return `Drop table ${plan.affectedDataset}`;

      default:

        return `Update schema for ${plan.affectedDataset}`;

    }

  }

}