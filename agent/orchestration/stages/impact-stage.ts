import { ImpactEngine } from "@/impact";

import { PipelineStage } from "../pipeline";
import { StateStore } from "../state";
import { MissingWorkflowStateError } from "../errors";

export class ImpactStage implements PipelineStage {

  readonly name = "impact";

  constructor(
    private readonly engine: ImpactEngine
  ) {}

  async execute(
    state: StateStore
  ): Promise<void> {

    const context = state.get("context");
    const plan = state.get("plan");
    const risk = state.get("risk");

    if (!context) {
      throw new MissingWorkflowStateError("context");
    }

    if (!plan) {
      throw new MissingWorkflowStateError("plan");
    }

    if (!risk) {
      throw new MissingWorkflowStateError("risk");
    }

    const impact =
      await this.engine.execute(
        context,
        plan,
        risk
      );

    state.set(
      "impact",
      impact
    );

  }

}