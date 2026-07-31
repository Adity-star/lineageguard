import { ContextBundle } from "../context/type.js";
import { ExecutionPlan } from "../planner/types.js";

import { RiskCalculator } from "./calculator.js";
import { RecommendationEngine } from "./recommendations.js";
import { RiskScorer } from "./scorer.js";
import { RiskAssessment } from "./types.js";
import { RiskValidator } from "./validator.js";

export class RiskEngine {
  constructor(
    private readonly calculator = new RiskCalculator(),
    private readonly scorer = new RiskScorer(),
    private readonly recommendations =
      new RecommendationEngine(),
    private readonly validator =
      new RiskValidator()
  ) {}

  assess(
    plan: ExecutionPlan,
    context: ContextBundle
  ): RiskAssessment {
    const metrics =
      this.calculator.calculate(
        plan,
        context
      );

    const scored =
      this.scorer.score(metrics);

    const findings = [];

    if (metrics.downstreamDatasets > 0) {
      findings.push({
        severity:
          metrics.downstreamDatasets > 10
            ? ("HIGH" as const)
            : ("MEDIUM" as const),
        category: "LINEAGE" as const,
        message:
          `${metrics.downstreamDatasets} downstream dataset(s) may be affected.`,
      });
    }

    if (!metrics.hasDocumentation) {
      findings.push({
        severity: "LOW" as const,
        category: "DOCUMENTATION" as const,
        message:
          "Dataset has no documentation.",
      });
    }

    if (!metrics.hasOwner) {
      findings.push({
        severity: "MEDIUM" as const,
        category: "GOVERNANCE" as const,
        message:
          "Dataset has no assigned owner.",
      });
    }

    const assessment: RiskAssessment = {
      overallRisk: scored.overallRisk,

      score: scored.score,

      affectedAssets: {
        datasets:
          metrics.downstreamDatasets,

        dashboards: 0,

        queries: metrics.queryCount,
      },

      findings,

      recommendations:
        this.recommendations
          .generate(
            metrics,
            scored.overallRisk
          )
          .map(r => r.title),

      requiresApproval:
        metrics.requiresApproval,
    };

    return this.validator.validate(
      assessment
    );
  }
}