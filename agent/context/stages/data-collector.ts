import { DataHubClient } from "@/mcp";

import { RawContext } from "../types";

export class MetadataCollectorStage {
  constructor(
    private readonly dataHub: DataHubClient
  ) {}

  public async execute(
    context: RawContext
  ): Promise<RawContext> {
    if (!context.dataset) {
      throw new Error(
        "Dataset must be resolved before metadata collection."
      );
    }

    /**
     * Right now the dataset object already contains
     * owners, tags, glossary, description and domain.
     *
     * Later, if DataHub exposes richer metadata,
     * this stage is where we enrich it.
     */

    const dataset = await this.dataHub.getDataset(
      context.dataset.urn
    );

    return {
      ...context,
      dataset,
    };
  }
}