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

    // Log full request details
    logger.info({
      event: "run_started",
      runId: requestId,
      requestId,
      owner: this.owner,
      repository: this.repository,
      baseBranch: this.baseBranch,
      request: {
        description: request.description,
        datasetUrn: request.datasetUrn,
        requestedBy: request.requestedBy,
        priority: request.priority,
        changeType: request.changeType,
        schemaUrn: request.schemaUrn,
        sql: request.sql?.substring(0, 200) + (request.sql && request.sql.length > 200 ? "..." : ""),
        documentation: request.documentation,
        tags: request.tags,
      },
    }, `🚀 Run Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Run ID:     ${requestId}
Owner:      ${this.owner}
Repo:       ${this.repository}
Branch:     ${this.baseBranch}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Request Details:
  Description:  ${request.description || "N/A"}
  Dataset URN:  ${request.datasetUrn || "N/A"}
  Schema URN:   ${request.schemaUrn || "N/A"}
  Requested By: ${request.requestedBy || "N/A"}
  Priority:     ${request.priority || "N/A"}
  Change Type:  ${request.changeType || "N/A"}
  Tags:         ${request.tags?.join(", ") || "N/A"}
  SQL Length:   ${request.sql?.length || 0} chars
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Deriving a unique key from the inputs to ensure idempotency if not explicitly provided
    const idempotencyKey = customIdempotencyKey || IdempotencyService.generateKey({
      description: request.description,
      datasetUrn: request.datasetUrn || "none",
      requestedBy: request.requestedBy,
      priority: request.priority || "none",
    });

    logger.info({
      event: "idempotency_key_generated",
      runId: requestId,
      key: idempotencyKey,
      customKeyProvided: !!customIdempotencyKey,
    }, `📋 Idempotency key: ${idempotencyKey} ${customIdempotencyKey ? "(custom)" : "(auto-generated)"}`);

    const executionBlock = async (): Promise<WorkflowState> => {
      logger.info({
        event: "execution_block_started",
        runId: requestId,
      }, `⚙️ Entering execution block...`);

      const state = new StateStore({
        request,
        runId: requestId,
      });

      logger.info({
        event: "state_store_created",
        runId: requestId,
        initialStateKeys: Object.keys(state.value),
      }, `📦 StateStore created with keys: ${Object.keys(state.value).join(", ")}`);

      try {
        logger.info({
          event: "workflow_event",
          runId: requestId,
          event: "STARTED",
        }, `📣 Emitting workflow event: STARTED`);

        await this.listener?.(WorkflowEvent.STARTED);

        perf.start('total');
        logger.info({
          event: "pipeline_execution_starting",
          runId: requestId,
          stageCount: this.pipeline['stages']?.length || "unknown",
        }, `▶️ Starting pipeline execution with ${this.pipeline['stages']?.length || "unknown"} stages...`);

        await this.pipeline.execute(state, perf);

        perf.end('total');

        logger.info({
          event: "pipeline_execution_completed",
          runId: requestId,
        }, `✅ Pipeline execution completed`);

        logger.info({
          event: "workflow_event",
          runId: requestId,
          event: "COMPLETED",
        }, `📣 Emitting workflow event: COMPLETED`);

        await this.listener?.(WorkflowEvent.COMPLETED, state.value);

        const metrics = perf.getMetrics();

        // Log detailed performance metrics
        logger.info({
          event: "run_completed",
          runId: requestId,
          performance: metrics,
          stateKeys: Object.keys(state.value),
          hasGithub: !!state.value.github,
          githubPrNumber: state.value.github?.number,
          githubPrUrl: state.value.github?.url,
          githubBranch: state.value.github?.branch,
          hasDatabase: !!state.value.database,
          hasDocumentation: !!state.value.documentation,
        }, `🎉 Workflow Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Runtime:  ${(metrics.totalMs / 1000).toFixed(2)}s
${state.value.github ? `GitHub PR:     #${state.value.github.number}
GitHub URL:    ${state.value.github.url}
GitHub Branch: ${state.value.github.branch}
` : "GitHub:        Not created (approval not granted)"}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Performance Breakdown:`);

        // Log each metric
        for (const [key, value] of Object.entries(metrics)) {
          if (key !== 'totalMs' && typeof value === 'number') {
            logger.info({ metric: key, durationMs: value }, `  ${key}: ${(value / 1000).toFixed(2)}s`);
          }
        }

        logger.info({
          runId: requestId,
          stateSummary: {
            hasGithub: !!state.value.github,
            githubPrNumber: state.value.github?.number,
            githubPrUrl: state.value.github?.url,
            githubBranch: state.value.github?.branch,
            hasDatabase: !!state.value.database,
            hasDocumentation: !!state.value.documentation,
            approvalStatus: state.value.approval?.status,
          },
        }, `State Summary: approval=${state.value.approval?.status}, github=${!!state.value.github}${state.value.github ? ` (PR #${state.value.github.number})` : ""}, database=${!!state.value.database}, documentation=${!!state.value.documentation}`);

        // Add performance metrics to state
        state.value.performance = metrics;

        return state.value;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        logger.error({
          event: "run_failed",
          runId: requestId,
          error: errorMessage,
          errorStack,
          stateKeys: Object.keys(state.value),
        }, `❌ Run Failed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error: ${errorMessage}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
State at failure: ${Object.keys(state.value).join(", ")}`);

        logger.info({
          event: "workflow_event",
          runId: requestId,
          event: "FAILED",
        }, `📣 Emitting workflow event: FAILED`);

        await this.listener?.(WorkflowEvent.FAILED, error);

        throw new WorkflowError(
          "Workflow execution failed.",
          "orchestrator",
          error
        );
      }
    };

    logger.info({
      event: "idempotency_check",
      runId: requestId,
      operationType: OperationType.WORKFLOW_EXECUTION,
    }, `🔄 Running execution with idempotency protection...`);

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