import { DataHubClient } from "@/mcp";
import { ChangeRequest } from "@/models";
import { RawContext } from "../types";

export class DatasetResolverStage  extends ContextStage {
  constructor(
    private readonly dataHub: DataHubClient
  ) {}

  public async execute(
    request: ChangeRequest,
    context: RawContext
  ): Promise<RawContext> {
    if (!request.userPrompt?.trim()) {
      throw new Error("Change request does not contain a valid prompt.");
    }

    const results = await this.dataHub.searchDatasets(
      request.userPrompt,
      5
    );

    if (results.length === 0) {
      throw new Error(
        `No matching dataset found for "${request.userPrompt}".`
      );
    }

    /**
     * TODO:
     * In future versions we will rank multiple candidates using
     * semantic similarity + metadata scoring.
     */

    const selected = results[0];

    const dataset = await this.dataHub.getDataset(
      selected.urn
    );

    return {
      ...context,
      dataset,
    };
  }
}