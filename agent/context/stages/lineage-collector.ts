import { ContextStage } from "./base-stage.js";
import { ContextState } from "../state.js";

export class LineageCollectorStage extends ContextStage {
  readonly name = "Lineage Collector";

  protected async run(
    state: ContextState
  ): Promise<void> {
    if (!state.dataset) {
      throw new Error(
        "Dataset must be resolved before collecting lineage."
      );
    }

    const lineage = await this.dataHub.getLineage(
      state.dataset.urn
    );

    state.lineage = lineage;
  }
}