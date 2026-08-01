import { ApprovalEngine } from "../../approval/approval-engine.js";

import { PipelineStage } from "../pipeline.js";
import { StateStore } from "../state.js";
import { MissingWorkflowStateError } from "../errors.js";
import { logger } from "../../config/logger.js";
import { PerformanceTracker } from "../../utils/performance.js";

export class ApprovalStage implements PipelineStage {

  readonly name = "approval";

  constructor(
    private readonly engine: ApprovalEngine,
    private readonly autoApprove: boolean = false
  ) {}

  async execute(
    state: StateStore,
    perf?: PerformanceTracker
  ): Promise<void> {

    logger.info({ event: "approval_started", autoApprove: this.autoApprove }, "Approval Process Started");

    const risk = state.get("risk");
    const impact = state.get("impact");

    if (!risk) {
      throw new MissingWorkflowStateError("risk");
    }

    if (!impact) {
      throw new MissingWorkflowStateError("impact");
    }

    const requiresApproval = this.engine.requiresApproval(risk, impact);

    if (this.autoApprove || !requiresApproval) {
      const approval = this.engine.processDecision(
        "APPROVED",
        "LineageGuard",
        this.autoApprove ? "Auto-approved: Testing mode" : "Auto-approved: Low risk change"
      );
      state.set("approval", approval);
    } else {
      const approval = this.engine.processDecision(
        "PENDING",
        "LineageGuard",
        "Awaiting manual approval"
      );
      state.set("approval", approval);
    }

    const approval = state.get("approval");

    logger.info({
      event: "approval_complete",
      approved: approval?.status === "APPROVED",
      autoApproved: this.autoApprove,
      requiresManualApproval: !this.autoApprove && approval?.status !== "APPROVED",
    }, "Approval Process Complete");

  }

}
