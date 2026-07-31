import { ContextBundle } from "@/context";
import { ExecutionPlan } from "@/planning";

import { RiskCalculator } from "./calculator";
import { RecommendationEngine } from "./recommendations";
import { RiskScorer } from "./scorer";
import { RiskAssessment } from "./types";
import { RiskValidator } from "./validator";

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
            ? "HIGH"
            : "MEDIUM",
        category: "LINEAGE",
        message:
          `${metrics.downstreamDatasets} downstream dataset(s) may be affected.`,
      });
    }

    if (!metrics.hasDocumentation) {
      findings.push({
        severity: "LOW",
        category: "DOCUMENTATION",
        message:
          "Dataset has no documentation.",
      });
    }

    if (!metrics.hasOwner) {
      findings.push({
        severity: "MEDIUM",
        category: "GOVERNANCE",
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