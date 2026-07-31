import { RiskEngine } from "@/risk";

import { PipelineStage } from "../pipeline";
import { StateStore } from "../state";
import { MissingWorkflowStateError } from "../errors";

export class RiskStage
  implements PipelineStage {

  readonly name = "risk";

  constructor(
    private readonly engine: RiskEngine
  ) {}

  async execute(
    state: StateStore
  ): Promise<void> {

    const context =
      state.get("context");

    const plan =
      state.get("plan");

    if (!context) {
      throw new MissingWorkflowStateError(
        "context"
      );
    }

    if (!plan) {
      throw new MissingWorkflowStateError(
        "plan"
      );
    }

    const risk =
      await this.engine.execute(
        context,
        plan
      );

    state.set(
      "risk",
      risk
    );

  }

}