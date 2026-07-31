import { PlanningEngine } from "@/planning";

import { PipelineStage } from "../pipeline";
import { StateStore } from "../state";
import { MissingWorkflowStateError } from "../errors";

export class PlanningStage
  implements PipelineStage {

  readonly name = "planning";

  constructor(
    private readonly engine: PlanningEngine
  ) {}

  async execute(
    state: StateStore
  ): Promise<void> {

    const context =
      state.get("context");

    if (!context) {
      throw new MissingWorkflowStateError(
        "context"
      );
    }

    const plan =
      await this.engine.execute(
        context
      );

    state.set(
      "plan",
      plan
    );

  }

}