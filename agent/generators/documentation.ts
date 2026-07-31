import { ExecutionPlan } from "@/planning";
import { RiskAssessment } from "@/risk";

import { DocumentationArtifact } from "./types";

export class DocumentationGenerator {
  generate(
    plan: ExecutionPlan,
    risk: RiskAssessment
  ): DocumentationArtifact {

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