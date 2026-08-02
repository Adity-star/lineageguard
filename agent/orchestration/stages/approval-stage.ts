import { ApprovalEngine } from "../../approval/approval-engine.js";

import { PipelineStage } from "../pipeline.js";
import { StateStore } from "../state.js";
import { MissingWorkflowStateError } from "../errors.js";
import { logger } from "../../config/logger.js";
import { PerformanceTracker } from "../../utils/performance.js";
import { IdempotencyService, withIdempotency, OperationType } from "../../utils/idempotency.js";

export class ApprovalStage implements PipelineStage {

  readonly name = "approval";

  constructor(
    private readonly engine: ApprovalEngine,
    private readonly idempotencyService: IdempotencyService,
    private readonly autoApprove: boolean = false
  ) {}

  async execute(
    state: StateStore,
    perf?: PerformanceTracker
  ): Promise<void> {

    const risk = state.get("risk");
    const impact = state.get("impact");

    if (!risk) {
      throw new MissingWorkflowStateError("risk");
    }

    if (!impact) {
      throw new MissingWorkflowStateError("impact");
    }

    const requiresApproval = this.engine.requiresApproval(risk, impact);

    logger.info({
      event: "approval_evaluation",
      requiresApproval,
      riskScore: risk.score,
      riskLevel: risk.overallRisk,
      impactScore: impact.score,
      impactLevel: impact.level,
      autoApprove: this.autoApprove,
    }, `Evaluating approval requirement: requiresApproval=${requiresApproval}`);

    const idempotencyKey = IdempotencyService.generateKey({
      requiresApproval,
      riskScore: risk.score,
      impactScore: impact.score,
      autoApprove: this.autoApprove,
    });

    const approval = await withIdempotency(
      {
        key: idempotencyKey,
        operationType: OperationType.APPROVAL_DECISION,
      },
      async () => {
        if (this.autoApprove || !requiresApproval) {
          const reason = this.autoApprove ? "Auto-approved: Testing mode" : "Auto-approved: Low risk change";
          logger.info({ 
            event: "approval_auto_approved", 
            reason,
            riskScore: risk.score,
            impactScore: impact.score,
          }, `✓ ${reason}`);
          return this.engine.processDecision(
            "APPROVED",
            "LineageGuard",
            reason
          );
        } else {
          logger.info({ 
            event: "approval_pending",
            riskScore: risk.score,
            impactScore: impact.score,
            riskLevel: risk.overallRisk,
            impactLevel: impact.level,
          }, "✓ Waiting For Human Approval");
          return this.engine.processDecision(
            "PENDING",
            "LineageGuard",
            "Awaiting manual approval"
          );
        }
      },
      this.idempotencyService
    );

    state.set("approval", approval);

    logger.info({
      event: "approval_complete",
      status: approval?.status,
      approved: approval?.status === "APPROVED",
      pending: approval?.status === "PENDING",
      rejected: approval?.status === "REJECTED",
      autoApproved: this.autoApprove,
      requiresManualApproval: !this.autoApprove && approval?.status !== "APPROVED",
    }, `Approval Process Complete: status=${approval?.status}`);

  }

}
