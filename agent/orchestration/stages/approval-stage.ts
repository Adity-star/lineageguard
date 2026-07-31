import { ApprovalEngine } from "../../approval/approval-engine.js";
import { RiskAssessment } from "../../risk/types.js";
import { ImpactReport } from "../../impact/types.js";

import { PipelineStage } from "../pipeline.js";
import { StateStore } from "../state.js";
import { MissingWorkflowStateError } from "../errors.js";

export class ApprovalStage implements PipelineStage {

  readonly name = "approval";

  constructor(
    private readonly engine: ApprovalEngine,
    private readonly autoApproveLowRisk: boolean = false
  ) {}

  async execute(
    state: StateStore
  ): Promise<void> {

    const risk = state.get("risk");
    const impact = state.get("impact");
    const plan = state.get("plan");

    if (!risk) {
      throw new MissingWorkflowStateError("risk");
    }

    if (!impact) {
      throw new MissingWorkflowStateError("impact");
    }

    if (!plan) {
      throw new MissingWorkflowStateError("plan");
    }

    const requiresApproval = this.engine.requiresApproval(risk, impact);

    if (!requiresApproval && this.autoApproveLowRisk) {
      // Auto-approve low-risk changes
      const decision = this.engine.processDecision(
        "APPROVED",
        "LineageGuard",
        "Auto-approved: Low risk change"
      );
      state.set("approval", decision);
      return;
    }

    if (requiresApproval) {
      // Create approval request for manual review
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const approvalRequest = this.engine.createApprovalRequest(
        requestId,
        risk,
        impact,
        state.get("context")?.dataset?.name || "unknown",
        plan.plan.summary
      );
      state.set("approvalRequest", approvalRequest);
      
      // Set initial pending status
      const decision = this.engine.processDecision(
        "PENDING",
        "LineageGuard",
        "Awaiting manual approval"
      );
      state.set("approval", decision);
    } else {
      // Auto-approve
      const decision = this.engine.processDecision(
        "APPROVED",
        "LineageGuard",
        "Auto-approved: No approval required"
      );
      state.set("approval", decision);
    }
  }

}
