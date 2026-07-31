import { ContextEngine } from "../../context/context-engine.js";

import { PipelineStage } from "../pipeline.js";
import { StateStore } from "../state.js";
import { MissingWorkflowStateError } from "../errors.js";

export class ContextStage implements PipelineStage {

  readonly name = "context";

  constructor(
    private readonly engine: ContextEngine
  ) {}

  async execute(
    state: StateStore
  ): Promise<void> {

    const request = state.get("request");

    if (!request) {
      throw new MissingWorkflowStateError(
        "request"
      );
    }

    const context =
      await this.engine.buildContext(request);

    state.set(
      "context",
      context
    );

  }

}