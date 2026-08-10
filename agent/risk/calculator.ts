import { ContextBundle } from '../context/type.js';
import { ExecutionPlan } from '../planner/types.js';

export interface RiskMetrics {
  affectedColumns: number;

  upstreamDatasets: number;

  downstreamDatasets: number;

  queryCount: number;

  documentCount: number;

  hasDocumentation: boolean;

  hasOwner: boolean;

  requiresApproval: boolean;

  operationType?: string;
}

export class RiskCalculator {
  calculate(plan: ExecutionPlan, context: ContextBundle): RiskMetrics {
    const upstreamDatasets = context.lineage?.upstream?.length || 0;

    const downstreamDatasets = context.lineage?.downstream?.length || 0;

    const queryCount = context.queries?.length || 0;

    const documentCount = context.documents?.length || 0;

    // Log actual context data being used
    console.log(
      {
        event: 'risk_calculation_context_data',
        datasetName: context.dataset?.name,
        datasetUrn: context.dataset?.urn,
        actualUpstreamCount: upstreamDatasets,
        actualDownstreamCount: downstreamDatasets,
        actualQueryCount: queryCount,
        actualDocumentCount: documentCount,
        actualOwnerCount: context.dataset?.owners?.length || 0,
        upstreamSample:
          context.lineage?.upstream
            ?.slice(0, 3)
            .map((u) => ({ name: u.name, urn: u.urn })) || [],
        downstreamSample:
          context.lineage?.downstream
            ?.slice(0, 3)
            .map((d) => ({ name: d.name, urn: d.urn })) || [],
        querySample:
          context.queries
            ?.slice(0, 3)
            .map((q) => ({ id: q.id, sql: q.sql?.substring(0, 50) })) || [],
      },
      'Risk calculation using actual context data',
    );

    // Extract operation type from plan for risk scoring
    const operationType = plan.requiredChanges?.[0]?.type ?? plan.intent;

    return {
      affectedColumns: plan.affectedColumns?.length || 0,

      upstreamDatasets,

      downstreamDatasets,

      queryCount,

      documentCount,

      hasDocumentation: documentCount > 0,

      hasOwner: context.dataset?.owners?.length > 0 || false,

      requiresApproval: plan.requiresApproval || false,

      operationType,
    };
  }
}
