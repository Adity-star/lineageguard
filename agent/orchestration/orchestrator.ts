import { ChangeRequest } from "../mcp/types.js";

import {
  Pipeline,
  PipelineStage,
} from "./pipeline.js";

import { StateStore } from "./state.js";

import { WorkflowState } from "./type.js";

import {
  WorkflowError,
} from "./errors.js";

import {
  WorkflowEvent,
  WorkflowListener,
} from "./events.js";
import { logger } from "../config/logger.js";
import { PerformanceTracker } from "../utils/performance.js";

export class Orchestrator {

  private readonly pipeline: Pipeline;

  constructor(
    stages: PipelineStage[],
    private readonly owner: string,
    private readonly repository: string,
    private readonly baseBranch: string,
    private readonly listener?: WorkflowListener
  ) {

    this.pipeline = new Pipeline(stages);

  }

  async execute(
    request: ChangeRequest
  ): Promise<WorkflowState> {

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const perf = new PerformanceTracker();

    logger.info({
      event: "run_started",
      requestId,
      description: request.description,
      datasetUrn: request.datasetUrn,
      requestedBy: request.requestedBy,
      priority: request.priority,
    }, "Run Started");

    const state =
      new StateStore({
        request,
      });

    try {

      await this.listener?.(
        WorkflowEvent.STARTED
      );

      perf.start('total');
      await this.pipeline.execute(
        state,
        perf
      );
      perf.end('total');

      await this.listener?.(
        WorkflowEvent.COMPLETED,
        state.value
      );

      const metrics = perf.getMetrics();

      logger.info({
        event: "run_completed",
        requestId,
        performance: metrics,
      }, "Run Completed");

      // Add performance metrics to state
      state.value.performance = metrics;

      return state.value;

    } catch (error) {

      logger.error({
        event: "run_failed",
        requestId,
        error: error instanceof Error ? error.message : String(error),
      }, "Run Failed");

      await this.listener?.(
        WorkflowEvent.FAILED,
        error
      );

      throw new WorkflowError(

        "Workflow execution failed.",

        "orchestrator",

        error

      );

    }

  }

}