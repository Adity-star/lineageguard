import { RiskEngine } from "../../risk/risk-engine.js";

import { PipelineStage } from "../pipeline.js";
import { StateStore } from "../state.js";
import { MissingWorkflowStateError } from "../errors.js";
import { logger } from "../../config/logger.js";
import { PerformanceTracker } from "../../utils/performance.js";

export class RiskStage
  implements PipelineStage {

  readonly name = "risk";

  constructor(
    private readonly engine: RiskEngine
  ) {}

  async execute(
    state: StateStore,
    perf?: PerformanceTracker
  ): Promise<void> {

    logger.info({ event: "risk_started" }, "Risk Assessment Started");

    const context = state.get("context");
    const plan = state.get("plan");

    if (!context) {
      throw new MissingWorkflowStateError("context");
    }

    if (!plan) {
      throw new MissingWorkflowStateError("plan");
    }

    const risk = this.engine.assess(plan, context);

    state.set(
      "risk",
      risk
    );

    logger.info({
      event: "risk_complete",
      overallRisk: risk.overallRisk,
      score: risk.score,
      requiresApproval: risk.requiresApproval,
    }, "Risk Assessment Complete");

  }

}