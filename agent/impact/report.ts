import { ContextBundle } from "../context/type.js";
import { ExecutionPlan } from "../planner/types.js";
import { RiskAssessment } from "../risk/types.js";

import { ImpactScore } from "./scorer.js";
import { Recommendation } from "./types.js";
import {
  ImpactReport,
  ImpactedAsset,
} from "./types.js";

export class ReportBuilder {

  build(
    context: ContextBundle,
    plan: any,
    risk: RiskAssessment,
    impact: ImpactScore,
    recommendations: Recommendation[]
  ): ImpactReport {

    const executionPlan = plan.plan || plan;

    return {

      summary: executionPlan.summary || executionPlan.intent || "Schema change request",

      score: impact.score,

      level: impact.level,

      requiresApproval:
        impact.requiresApproval,

      affectedColumns:
        executionPlan.affectedColumns || [],

      affectedAssets:
        this.collectAssets(context),

      recommendations,

      triggeredRules: impact.triggeredRules,

      generatedAt:
        new Date().toISOString(),

      metadata: {

        generatedBy:
          "LineageGuard",

        version: "1.0.0",

      },

    };

  }

  private collectAssets(
    context: ContextBundle
  ): ImpactedAsset[] {

    const assets: ImpactedAsset[] = [];

    if (context.dataset?.urn && context.dataset?.name) {
      assets.push({
        urn: context.dataset.urn,
        name: context.dataset.name,
        type: "DATASET",
      });
    }

    const downstream = context.lineage?.downstream || [];
    for (const dataset of downstream) {
      if (dataset?.urn && dataset?.name) {
        assets.push({
          urn: dataset.urn,
          name: dataset.name,
          type: "DATASET",
        });
      }
    }

    return assets;
  }

}