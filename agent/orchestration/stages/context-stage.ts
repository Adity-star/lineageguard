import { ContextEngine } from "../../context/context-engine.js";

import { PipelineStage } from "../pipeline.js";
import { StateStore } from "../state.js";
import { MissingWorkflowStateError } from "../errors.js";
import { logger } from "../../config/logger.js";
import { PerformanceTracker } from "../../utils/performance.js";
import { IdempotencyService, withIdempotency, OperationType } from "../../utils/idempotency.js";

export class ContextStage implements PipelineStage {

  readonly name = "context";

  constructor(
    private readonly engine: ContextEngine,
    private readonly idempotencyService: IdempotencyService
  ) {}

  async execute(
    state: StateStore,
    perf?: PerformanceTracker
  ): Promise<void> {

    logger.info({ event: "context_started" }, "Context Started");

    const request = state.get("request");

    if (!request) {
      throw new MissingWorkflowStateError(
        "request"
      );
    }

    const idempotencyKey = IdempotencyService.generateKey({
      description: request.description,
      datasetUrn: request.datasetUrn || "none",
      requestedBy: request.requestedBy,
      priority: request.priority || "none",
    });

    const context = await withIdempotency(
      {
        key: idempotencyKey,
        operationType: OperationType.CONTEXT_BUILD,
      },
      async () => {
        return await this.engine.buildContext(request);
      },
      this.idempotencyService
    );

    state.set(
      "context",
      context
    );

    logger.info({
      event: "context_complete",
      datasetName: context.dataset?.name,
      platform: context.dataset?.platform,
      fieldCount: context.schema?.length || 0,
    }, "Context Complete");

  }

}