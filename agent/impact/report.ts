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
    plan: ExecutionPlan,
    risk: RiskAssessment,
    impact: ImpactScore,
    recommendations: Recommendation[]
  ): ImpactReport {

    return {

      summary: plan.summary,

      score: impact.score,

      level: impact.level,

      requiresApproval:
        impact.requiresApproval,

      affectedColumns:
        plan.affectedColumns,

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

    assets.push({

      urn: context.dataset.urn,

      name: context.dataset.name,

      type: "DATASET",

    });

    for (const dataset of context.lineage.downstream) {

      assets.push({

        urn: dataset.urn,

        name: dataset.name,

        type: "DATASET",

      });

    }

    return assets;
  }

}