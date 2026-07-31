import { Generator } from "@/generator";

import { PipelineStage } from "../pipeline";
import { StateStore } from "../state";
import { MissingWorkflowStateError } from "../errors";

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
        plan,
        risk
      );

    state.set(
      "generation",
      generation
    );
  }

}