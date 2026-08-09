import { DataHubClient } from '../../mcp/datahub-client.js';
import { ContextState } from '../state.js';

export class MetadataCollectorStage {
  constructor(private readonly dataHub: DataHubClient) {}

  public async execute(state: ContextState): Promise<void> {
    if (!state.dataset) {
      throw new Error('Dataset must be resolved before metadata collection.');
    }

    /**
     * Right now the dataset object already contains
     * owners, tags, glossary, description and domain.
     *
     * Later, if DataHub exposes richer metadata,
     * this stage is where we enrich it.
     */

    const dataset = await this.dataHub.getDataset(state.dataset.urn);

    state.dataset = dataset;
  }
}
