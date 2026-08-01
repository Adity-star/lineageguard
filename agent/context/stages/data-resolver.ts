import { DataHubClient } from "../../mcp/datahub-client.js";
import { ChangeRequest } from "../../mcp/types.js";
import { ContextState } from "../state.js";

export class DatasetResolverStage {
  constructor(
    private readonly dataHub: DataHubClient
  ) {}

  public async execute(
    request: ChangeRequest,
    state: ContextState
  ): Promise<void> {
    if (!request.description?.trim()) {
      throw new Error("Change request does not contain a valid description.");
    }

    const results = await this.dataHub.searchDatasets(
      request.description,
      5
    );

    if (results.length === 0) {
      throw new Error(
        `No matching dataset found for "${request.description}".`
      );
    }

    const selected = results[0];

    if (!selected) {
      throw new Error("No dataset selected from search results.");
    }

    const dataset = await this.dataHub.getDataset(
      selected.urn
    );

    state.dataset = dataset;
  }
}