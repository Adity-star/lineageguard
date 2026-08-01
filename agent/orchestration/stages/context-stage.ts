import { ContextEngine } from "../../context/context-engine.js";

import { PipelineStage } from "../pipeline.js";
import { StateStore } from "../state.js";
import { MissingWorkflowStateError } from "../errors.js";
import { logger } from "../../config/logger.js";
import { PerformanceTracker } from "../../utils/performance.js";

export class ContextStage implements PipelineStage {

  readonly name = "context";

  constructor(
    private readonly engine: ContextEngine
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

    const context =
      await this.engine.buildContext(request);

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