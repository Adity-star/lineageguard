import { PlanningEngine } from "../../planner/planning-engine.js";

import { PipelineStage } from "../pipeline.js";
import { StateStore } from "../state.js";
import { MissingWorkflowStateError } from "../errors.js";
import { logger } from "../../config/logger.js";
import { PerformanceTracker } from "../../utils/performance.js";

export class PlanningStage implements PipelineStage {

  readonly name = "planning";

  constructor(
    private readonly engine: PlanningEngine
  ) {}

  async execute(
    state: StateStore,
    perf?: PerformanceTracker
  ): Promise<void> {

    logger.info({ event: "planning_started" }, "Planning Started");

    const request = state.get("request");
    const context = state.get("context");

    if (!request) {
      throw new MissingWorkflowStateError("request");
    }

    if (!context) {
      throw new MissingWorkflowStateError("context");
    }

    const plan = await this.engine.plan(request, context);

    state.set("plan", plan.plan);

    logger.info({
      event: "planning_complete",
      confidence: plan.plan?.confidence,
      requiresApproval: plan.plan?.requiresApproval,
      affectedColumns: plan.plan?.affectedColumns?.length || 0,
    }, "Planning Complete");

  }

}