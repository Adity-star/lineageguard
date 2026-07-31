import { ContextBundle } from "../context/type.js";
import { ExecutionPlan } from "../planner/types.js";
import { RiskAssessment } from "../risk/types.js";

import { 
  Recommendation,
  ImpactLevel,
} from "./types.js";

export class RecommendationEngine {

  generate(
    context: ContextBundle,
    plan: ExecutionPlan,
    risk: RiskAssessment,
    impact: ImpactLevel
  ): Recommendation[] {

    const recommendations: Recommendation[] = [];

    // ----------------------------------------
    // Approval
    // ----------------------------------------

    if (risk.requiresApproval) {
      recommendations.push({
        id: "approval",
        title: "Require Manual Approval",
        description:
          "This schema change should be reviewed and approved before execution.",
        required: true,
      });
    }

    // ----------------------------------------
    // Downstream Consumers
    // ----------------------------------------

    if (context.lineage.downstream.length > 0) {
      recommendations.push({
        id: "notify-consumers",
        title: "Notify Downstream Owners",
        description:
          `Notify owners of ${context.lineage.downstream.length} downstream datasets before deployment.`,
        required: impact !== "LOW",
      });
    }

    // ----------------------------------------
    // Dashboards
    // ----------------------------------------

    if (context.queries.length > 10) {
      recommendations.push({
        id: "review-dashboards",
        title: "Review Dashboards",
        description:
          "Validate dashboards and reports that depend on this dataset.",
        required: true,
      });
    }

    // ----------------------------------------
    // Rename Column
    // ----------------------------------------

    if (plan.intent === "rename_column") {

      recommendations.push({
        id: "update-code",
        title: "Update Client Code",
        description:
          "Applications and ETL pipelines referencing this column should be updated.",
        required: true,
      });

    }

    // ----------------------------------------
    // Drop Column
    // ----------------------------------------

    if (plan.intent === "drop_column") {

      recommendations.push({
        id: "backup-column",
        title: "Create Backup",
        description:
          "Back up affected data before removing the column.",
        required: true,
      });

    }

    // ----------------------------------------
    // Missing Documentation
    // ----------------------------------------

    if (context.documents.length === 0) {

      recommendations.push({
        id: "documentation",
        title: "Improve Documentation",
        description:
          "Add documentation for this dataset before making structural changes.",
        required: false,
      });

    }

    // ----------------------------------------
    // Missing Owner
    // ----------------------------------------

    if (context.dataset.owners.length === 0) {

      recommendations.push({
        id: "assign-owner",
        title: "Assign Dataset Owner",
        description:
          "Ownership should be assigned before deployment.",
        required: true,
      });

    }

    // ----------------------------------------
    // Critical Risk
    // ----------------------------------------

    if (impact === "CRITICAL") {

      recommendations.push({
        id: "maintenance-window",
        title: "Schedule Maintenance Window",
        description:
          "Execute this migration during a maintenance window.",
        required: true,
      });

    }

    return recommendations;
  }

}