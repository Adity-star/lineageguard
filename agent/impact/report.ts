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

    // Log current plan data for debugging
    console.log({
      event: "impact_report_building",
      riskScore: risk.score,
      impactScore: impact.score,
      scoresAligned: risk.score === impact.score,
      level: impact.level,
      currentPlanSummary: executionPlan.summary,
      currentPlanIntent: executionPlan.intent,
      currentAffectedColumns: executionPlan.affectedColumns,
      currentRequiredChanges: executionPlan.requiredChanges,
    });

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

      approvedAt: undefined, 

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
    
    console.log({
      event: "collecting_downstream_assets",
      downstreamCount: downstream.length,
      downstreamSample: downstream.slice(0, 3).map(d => ({ urn: d.urn, name: d.name })),
    }, "Collecting downstream assets from context");

    for (const dataset of downstream) {
      if (dataset?.urn && dataset?.name) {
        assets.push({
          urn: dataset.urn,
          name: dataset.name,
          type: "DATASET",
        });
      }
    }

    console.log({
      event: "collected_assets",
      totalAssets: assets.length,
      assets: assets.map(a => ({ name: a.name, type: a.type })),
    }, "Collected impacted assets");

    return assets;
  }

}