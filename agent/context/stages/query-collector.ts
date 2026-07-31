import { ContextStage } from "./base-stage.js";
import { ContextState } from "../state.js";

export class QueryCollectorStage extends ContextStage {
  readonly name = "Query Collector";

  protected async run(
    state: ContextState
  ): Promise<void> {
    if (!state.dataset) {
      throw new Error(
        "Dataset must be resolved before collecting queries."
      );
    }

    const queries = await this.dataHub.getQueries(
      state.dataset.urn
    );

    state.queries = queries;
  }
}