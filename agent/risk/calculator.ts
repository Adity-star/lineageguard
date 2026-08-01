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
      context.lineage?.upstream?.length || 0;

    const downstreamDatasets =
      context.lineage?.downstream?.length || 0;

    const queryCount =
      context.queries?.length || 0;

    const documentCount =
      context.documents?.length || 0;

    return {
      affectedColumns:
        plan.affectedColumns?.length || 0,

      upstreamDatasets,

      downstreamDatasets,

      queryCount,

      documentCount,

      hasDocumentation:
        documentCount > 0,

      hasOwner:
        context.dataset?.owners?.length > 0 || false,

      requiresApproval:
        plan.requiresApproval || false,
    };
  }
}