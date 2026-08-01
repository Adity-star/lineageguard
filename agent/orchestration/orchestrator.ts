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
import { IdempotencyService, withIdempotency, OperationType } from "../utils/idempotency.js";

export class Orchestrator {

  private readonly pipeline: Pipeline;

  constructor(
    stages: PipelineStage[],
    private readonly owner: string,
    private readonly repository: string,
    private readonly baseBranch: string,
    private readonly idempotencyService: IdempotencyService,
    private readonly listener?: WorkflowListener
  ) {

    this.pipeline = new Pipeline(stages);

  }

  async execute(
    request: ChangeRequest,
    customIdempotencyKey?: string
  ): Promise<WorkflowState> {

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const perf = new PerformanceTracker();

    logger.info({
      event: "run_started",
      runId: requestId,
      requestId,
      description: request.description,
      datasetUrn: request.datasetUrn,
      requestedBy: request.requestedBy,
      priority: request.priority,
    }, `🚀 Run Started\nRun ID: ${requestId}\n──────────────────────────────────`);

    // Deriving a unique key from the inputs to ensure idempotency if not explicitly provided
    const idempotencyKey = customIdempotencyKey || IdempotencyService.generateKey({
      description: request.description,
      datasetUrn: request.datasetUrn || "none",
      requestedBy: request.requestedBy,
      priority: request.priority || "none",
    });

    const executionBlock = async (): Promise<WorkflowState> => {
      const state =
        new StateStore({
          request,
          runId: requestId,
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
          runId: requestId,
          requestId,
          performance: metrics,
        }, `🎉 Workflow Complete\n\nTotal Runtime: ${(metrics.totalMs / 1000).toFixed(1)}s`);

        // Add performance metrics to state
        state.value.performance = metrics;

        return state.value;

      } catch (error) {

        logger.error({
          event: "run_failed",
          runId: requestId,
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
    };

    return withIdempotency<WorkflowState>(
      {
        key: idempotencyKey,
        operationType: OperationType.WORKFLOW_EXECUTION,
      },
      executionBlock,
      this.idempotencyService,
      (result) => result.github?.number ? String(result.github.number) : undefined
    );
  }

}