import { ContextEngine } from "@/context";

import { PipelineStage } from "../pipeline";
import { StateStore } from "../state";
import { MissingWorkflowStateError } from "../errors";

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
      await this.engine.execute(request);

    state.set(
      "context",
      context
    );

  }

}