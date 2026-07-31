import { Generator } from "../../generators/generator.js";

import { PipelineStage } from "../pipeline.js";
import { StateStore } from "../state.js";
import { MissingWorkflowStateError } from "../errors.js";

export class GeneratorStage implements PipelineStage {

  readonly name = "generator";

  constructor(
    private readonly engine: Generator
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

    const generation =
      await this.engine.generate(
        context.schema,
        plan.plan,
        risk
      );

    state.set(
      "generation",
      generation
    );
  }

}