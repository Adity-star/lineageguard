import { PlanningEngine } from "../../planner/planning-engine.js";

import { PipelineStage } from "../pipeline.js";
import { StateStore } from "../state.js";
import { MissingWorkflowStateError } from "../errors.js";

export class PlanningStage
  implements PipelineStage {

  readonly name = "planning";

  constructor(
    private readonly engine: PlanningEngine
  ) {}

  async execute(
    state: StateStore
  ): Promise<void> {

    const request = state.get("request");
    const context = state.get("context");

    if (!request) {
      throw new MissingWorkflowStateError("request");
    }

    if (!context) {
      throw new MissingWorkflowStateError("context");
    }

    const plan =
      await this.engine.plan(request, context);

    state.set(
      "plan",
      plan
    );

  }

}