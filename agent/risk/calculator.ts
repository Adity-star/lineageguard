import { ContextBundle } from "../context/type.js";
import { ExecutionPlan } from "../planner/types.js";

export interface RiskMetrics {
  affectedColumns: number;

  upstreamDatasets: number;

  downstreamDatasets: number;

  queryCount: number;

  documentCount: number;

  hasDocumentation: boolean;

  hasOwner: boolean;

  requiresApproval: boolean;
}

export class RiskCalculator {
  calculate(
    plan: ExecutionPlan,
    context: ContextBundle
  ): RiskMetrics {
    const upstreamDatasets =
      context.lineage.upstream.length;

    const downstreamDatasets =
      context.lineage.downstream.length;

    const queryCount =
      context.queries.length;

    const documentCount =
      context.documents.length;

    return {
      affectedColumns:
        plan.affectedColumns.length,

      upstreamDatasets,

      downstreamDatasets,

      queryCount,

      documentCount,

      hasDocumentation:
        documentCount > 0,

      hasOwner:
        context.dataset.owners.length > 0,

      requiresApproval:
        plan.requiresApproval,
    };
  }
}