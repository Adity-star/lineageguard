import { RiskEngine } from "../../risk/risk-engine.js";

import { PipelineStage } from "../pipeline.js";
import { StateStore } from "../state.js";
import { MissingWorkflowStateError } from "../errors.js";
import { logger } from "../../config/logger.js";
import { PerformanceTracker } from "../../utils/performance.js";
import { IdempotencyService, withIdempotency, OperationType } from "../../utils/idempotency.js";

export class RiskStage
  implements PipelineStage {

  readonly name = "risk";

  constructor(
    private readonly engine: RiskEngine,
    private readonly idempotencyService: IdempotencyService
  ) {}

  async execute(
    state: StateStore,
    perf?: PerformanceTracker
  ): Promise<void> {

    const context = state.get("context");
    const plan = state.get("plan");

    if (!context) {
      throw new MissingWorkflowStateError("context");
    }

    if (!plan) {
      throw new MissingWorkflowStateError("plan");
    }

    const idempotencyKey = IdempotencyService.generateKey({
      planActions: plan.requiredChanges || [],
      contextDatasetUrn: context.dataset?.urn || "none",
    });

    const risk = await withIdempotency(
      {
        key: idempotencyKey,
        operationType: OperationType.RISK_ASSESSMENT,
      },
      async () => {
        return this.engine.assess(plan, context);
      },
      this.idempotencyService
    );

    state.set(
      "risk",
      risk
    );

    logger.info({
      event: "risk_score",
      overallRisk: risk.overallRisk,
      score: risk.score,
    }, `✓ Risk Score: ${risk.overallRisk} (${risk.score})`);

    logger.info({
      event: "risk_complete",
      overallRisk: risk.overallRisk,
      score: risk.score,
      requiresApproval: risk.requiresApproval,
    }, "Risk Assessment Complete");

  }

}