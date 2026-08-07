import { ExecutionPlan } from "../planner/types.js";
import { RiskAssessment } from "../risk/types.js";

import { DocumentationArtifact } from "./types.js";

export class DocumentationGenerator {
  generate(
    plan: ExecutionPlan,
    risk: RiskAssessment
  ): DocumentationArtifact {

    // Log current plan data for debugging
    console.log({
      event: "documentation_generation",
      currentPlanSummary: plan.summary,
      currentPlanIntent: plan.intent,
      currentAffectedColumns: plan.affectedColumns,
      currentRequiredChanges: plan.requiredChanges,
    });

    const markdown = [
      "# LineageGuard Change Report",
      "",
      "## Summary",
      plan.summary,
      "",
      "## Intent",
      plan.intent,
      "",
      "## Risk",
      `- Level: ${risk.overallRisk}`,
      `- Score: ${risk.score}/100`,
      "",
      "## Affected Columns",
      plan.affectedColumns?.join(", ") || "None",
      "",
      "## Required Changes",
      ...plan.requiredChanges.map(
        c => `- ${c.description}`
      ),
      "",
      "## Recommendations",
      ...risk.recommendations.map(
        r => `- ${r}`
      ),
      "",
      "## Approval",
      risk.requiresApproval
        ? "Required"
        : "Not Required",
    ].join("\n");

    return {
      markdown,
    };
  }
}