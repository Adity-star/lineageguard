import { DataHubClient } from '../../mcp/datahub-client.js';
import { ChangeRequest } from '../../mcp/types.js';
import { ContextState } from '../state.js';
import { logger } from '../../config/logger.js';

export class DatasetResolverStage {
  constructor(private readonly dataHub: DataHubClient) {}

  public async execute(
    request: ChangeRequest,
    state: ContextState,
  ): Promise<void> {
    // If datasetUrn is provided, use it directly instead of searching
    if (request.datasetUrn?.trim()) {
      const urn = request.datasetUrn;

      logger.info(
        {
          event: 'dataset_resolver_using_provided_urn',
          urn,
        },
        `Attempting to retrieve dataset by URN: ${urn}`,
      );

      try {
        const dataset = await this.dataHub.getDataset(urn);

        logger.info(
          {
            event: 'dataset_resolver_urn_lookup_success',
            urn,
            datasetName: dataset.name,
          },
          `Successfully retrieved dataset by URN: ${dataset.name}`,
        );

        state.dataset = dataset;
        return;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        logger.warn(
          {
            event: 'dataset_resolver_urn_lookup_failed',
            urn,
            errorMessage,
            errorType:
              error instanceof Error ? error.constructor.name : typeof error,
          },
          `Failed to lookup dataset by URN: ${errorMessage}. Falling back to search by description.`,
        );
      }
    }

    // Fallback: search by description if URN is not provided or lookup failed
    if (!request.description?.trim()) {
      throw new Error(
        'Change request does not contain a valid description or datasetUrn. ' +
          'Please provide either a datasetUrn or a description to search for the dataset.',
      );
    }

    logger.info(
      {
        event: 'dataset_resolver_searching_by_description',
        query: request.description,
      },
      `Searching for dataset by description: "${request.description}"`,
    );

    const results = await this.dataHub.searchDatasets(request.description, 5);

    if (results.length === 0) {
      throw new Error(
        `No matching dataset found for "${request.description}". ` +
          `Verify that the dataset exists in DataHub and the description is accurate.`,
      );
    }

    logger.info(
      {
        event: 'dataset_resolver_search_results',
        query: request.description,
        resultCount: results.length,
        topResults: results
          .slice(0, 3)
          .map((r) => ({ urn: r.urn, name: r.name })),
      },
      `Found ${results.length} matching dataset(s), selecting first result`,
    );

    const selected = results[0];

    if (!selected) {
      throw new Error(
        'No dataset selected from search results - unexpected state.',
      );
    }

    logger.info(
      {
        event: 'dataset_resolver_retrieving_selected',
        selectedUrn: selected.urn,
        selectedName: selected.name,
      },
      `Retrieving full dataset details for: ${selected.name}`,
    );

    try {
      const dataset = await this.dataHub.getDataset(selected.urn);

      logger.info(
        {
          event: 'dataset_resolver_selected_success',
          urn: selected.urn,
          datasetName: dataset.name,
        },
        `Successfully retrieved selected dataset: ${dataset.name}`,
      );

      state.dataset = dataset;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(
        {
          event: 'dataset_resolver_selected_failed',
          selectedUrn: selected.urn,
          errorMessage,
        },
        `Failed to retrieve selected dataset: ${errorMessage}`,
      );

      throw error;
    }
  }
}
