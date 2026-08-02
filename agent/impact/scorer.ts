import { ContextBundle } from "../context/type.js";
import { ExecutionPlan } from "../planner/types.js";
import { RiskAssessment } from "../risk/types.js";

import { ImpactLevel } from "./types.js";

export interface ImpactRule {
  id: string;
  description: string;
  weight: number;

  applies(
    context: ContextBundle,
    plan: ExecutionPlan,
    risk: RiskAssessment
  ): boolean;
}

export interface ImpactScore {
  score: number;

  level: ImpactLevel;

  requiresApproval: boolean;

  triggeredRules: ImpactRule[];
}

const IMPACT_RULES: ImpactRule[] = [
  {
    id: "drop-table",
    description: "Dropping a table",
    weight: 70,
    applies: (_, plan) =>
      plan.intent === "drop_table",
  },

  {
    id: "drop-column",
    description: "Dropping a column",
    weight: 35,
    applies: (_, plan) =>
      plan.intent === "drop_column",
  },

  {
    id: "rename-column",
    description: "Renaming a column",
    weight: 10,
    applies: (_, plan) =>
      plan.intent === "rename_column",
  },

  {
    id: "add-column",
    description: "Adding a column",
    weight: 5,
    applies: (_, plan) =>
      plan.intent === "add_column",
  },

  {
    id: "many-downstream",
    description: "More than five downstream datasets",
    weight: 20,
    applies: (context) =>
      context.lineage.downstream.length > 5,
  },

  {
    id: "many-queries",
    description: "Frequently queried dataset",
    weight: 20,
    applies: (context) =>
      context.queries.length > 20,
  },

  {
    id: "missing-owner",
    description: "Dataset has no owner",
    weight: 10,
    applies: (context) =>
      context.dataset.owners.length === 0,
  },

  {
    id: "missing-documentation",
    description: "Dataset lacks documentation",
    weight: 10,
    applies: (context) =>
      context.documents.length === 0,
  },
];

export class ImpactScorer {

  score(
    context: ContextBundle,
    plan: ExecutionPlan,
    risk: RiskAssessment
  ): ImpactScore {

    // Derive score from Risk Engine (source of truth)
    const baseScore = risk.score;

    const triggeredRules = IMPACT_RULES.filter(rule =>
      rule.applies(
        context,
        plan,
        risk
      )
    );

    // Calculate additional impact-specific factors
    // These are used for detailed reporting but don't override the risk score
    const impactFactorScore = triggeredRules.reduce(
      (sum, rule) => sum + rule.weight,
      0
    );

    // Log the impact factors for transparency
    if (impactFactorScore > 0) {
      console.log({
        event: "impact_factors_calculated",
        baseRiskScore: baseScore,
        impactFactorsTotal: impactFactorScore,
        finalScore: baseScore,
        triggeredRulesCount: triggeredRules.length,
      });
    }

    // Use Risk Engine score as the authoritative score
    const score = baseScore;

    const level = this.determineLevel(score);

    return {

      score,

      level,

      requiresApproval:
        score >= 50 || risk.requiresApproval,

      triggeredRules,

    };

  }

  private determineLevel(
    score: number
  ): ImpactLevel {

    if (score >= 75) {
      return "CRITICAL";
    }

    if (score >= 50) {
      return "HIGH";
    }

    if (score >= 25) {
      return "MEDIUM";
    }

    return "LOW";
  }

}