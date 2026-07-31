import { ContextStage } from "./base-stage";
import { ContextState } from "../state";

export class QueryCollectorStage extends ContextStage {
  readonly name = "Query Collector";

  protected async run(
    state: ContextState
  ): Promise<ContextState> {
    if (!state.dataset) {
      throw new Error(
        "Dataset must be resolved before collecting queries."
      );
    }

    const queries = await this.dataHub.getQueries(
      state.dataset.urn
    );

    return {
      ...state,
      queries,
    };
  }
}