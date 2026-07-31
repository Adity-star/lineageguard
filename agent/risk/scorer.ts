import { RiskAssessment } from "./types.js";
import { RiskMetrics } from "./calculator.js";

export class RiskScorer {
  score(metrics: RiskMetrics): Pick<
    RiskAssessment,
    "overallRisk" | "score"
  > {
    let score = 0;

    // Downstream impact
    if (metrics.downstreamDatasets > 20) {
      score += 35;
    } else if (metrics.downstreamDatasets > 10) {
      score += 25;
    } else if (metrics.downstreamDatasets > 0) {
      score += 10;
    }

    // Upstream dependencies
    if (metrics.upstreamDatasets > 10) {
      score += 15;
    } else if (metrics.upstreamDatasets > 0) {
      score += 5;
    }

    // Number of affected columns
    if (metrics.affectedColumns > 5) {
      score += 20;
    } else if (metrics.affectedColumns > 1) {
      score += 10;
    }

    // Frequently queried datasets
    if (metrics.queryCount > 100) {
      score += 15;
    } else if (metrics.queryCount > 20) {
      score += 8;
    }

    // Missing documentation
    if (!metrics.hasDocumentation) {
      score += 10;
    }

    // Missing ownership
    if (!metrics.hasOwner) {
      score += 10;
    }

    // Explicit approval requested by planner
    if (metrics.requiresApproval) {
      score += 15;
    }

    score = Math.min(score, 100);

    return {
      score,
      overallRisk: this.level(score),
    };
  }

  private level(
    score: number
  ): RiskAssessment["overallRisk"] {
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