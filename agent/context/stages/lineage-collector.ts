import { ContextStage } from "./base-stage";
import { ContextState } from "../state";

export class LineageCollectorStage extends ContextStage {
  readonly name = "Lineage Collector";

  protected async run(
    state: ContextState
  ): Promise<ContextState> {
    if (!state.dataset) {
      throw new Error(
        "Dataset must be resolved before collecting lineage."
      );
    }

    const lineage = await this.dataHub.getLineage(
      state.dataset.urn
    );

    return {
      ...state,
      lineage,
    };
  }
}