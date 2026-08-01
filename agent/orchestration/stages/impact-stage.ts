import { ImpactEngine } from "../../impact/impact-engine.js";

import { PipelineStage } from "../pipeline.js";
import { StateStore } from "../state.js";
import { MissingWorkflowStateError } from "../errors.js";
import { logger } from "../../config/logger.js";
import { PerformanceTracker } from "../../utils/performance.js";
import { IdempotencyService, withIdempotency, OperationType } from "../../utils/idempotency.js";

export class ImpactStage implements PipelineStage {

  readonly name = "impact";

  constructor(
    private readonly engine: ImpactEngine,
    private readonly idempotencyService: IdempotencyService
  ) {}

  async execute(
    state: StateStore,
    perf?: PerformanceTracker
  ): Promise<void> {

    logger.info({ event: "impact_started" }, "Impact Analysis Started");

    const context = state.get("context");
    const plan = state.get("plan");
    const generation = state.get("generation");
    const risk = state.get("risk");

    if (!context) {
      throw new MissingWorkflowStateError("context");
    }

    if (!plan) {
      throw new MissingWorkflowStateError("plan");
    }

    if (!generation) {
      throw new MissingWorkflowStateError("generation");
    }

    if (!risk) {
      throw new MissingWorkflowStateError("risk");
    }

    const idempotencyKey = IdempotencyService.generateKey({
      datasetUrn: context.dataset?.urn || "none",
      planActions: plan.actions || [],
      riskLevel: risk.overallRisk,
    });

    const impact = await withIdempotency(
      {
        key: idempotencyKey,
        operationType: OperationType.IMPACT_WRITEBACK,
      },
      async () => {
        return await this.engine.execute(context, plan, risk);
      },
      this.idempotencyService
    );

    state.set("impact", impact);

    logger.info({
      event: "impact_complete",
      level: impact.level,
      score: impact.score,
      affectedAssets: impact.affectedAssets?.length || 0,
    }, "Impact Analysis Complete");

  }

}