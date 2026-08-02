import { DataHubClient } from "../../mcp/datahub-client.js";
import { ChangeRequest } from "../../mcp/types.js";
import { ContextState } from "../state.js";
import { logger } from "../../config/logger.js";

/**
 * Normalizes DataHub URN format to correct syntax
 * Invalid: urn:li:dataset:urn:li:dataPlatform:hdfs,SampleHdfsDataset,PROD
 * Valid:   urn:li:dataset:(urn:li:dataPlatform:hdfs,SampleHdfsDataset,PROD)
 */
function normalizeDataHubUrn(urn: string): string {
  // Check if URN is already in correct format with parentheses
  if (urn.includes("urn:li:dataset:(")) {
    return urn;
  }

  // Fix malformed URN: urn:li:dataset:urn:li:dataPlatform:... -> urn:li:dataset:(urn:li:dataPlatform:...)
  if (urn.startsWith("urn:li:dataset:urn:li:dataPlatform:")) {
    const compositeKey = urn.substring("urn:li:dataset:".length);
    return `urn:li:dataset:(${compositeKey})`;
  }

  return urn;
}

export class DatasetResolverStage {
  constructor(
    private readonly dataHub: DataHubClient
  ) {}

  public async execute(
    request: ChangeRequest,
    state: ContextState
  ): Promise<void> {
    // If datasetUrn is provided, use it directly instead of searching
    if (request.datasetUrn?.trim()) {
      const normalizedUrn = normalizeDataHubUrn(request.datasetUrn);

      logger.info({
        event: "dataset_resolver_using_provided_urn",
        originalUrn: request.datasetUrn,
        normalizedUrn,
      }, `Using provided dataset URN directly (normalized from invalid format)`);

      try {
        const dataset = await this.dataHub.getDataset(normalizedUrn);
        state.dataset = dataset;
        return;
      } catch (error) {
        logger.warn({
          event: "dataset_resolver_urn_lookup_failed",
          urn: normalizedUrn,
          error: error instanceof Error ? error.message : String(error),
        }, `Failed to lookup dataset by URN, falling back to search by description`);
      }
    }

    // Fallback: search by description if URN is not provided or lookup failed
    if (!request.description?.trim()) {
      throw new Error("Change request does not contain a valid description or datasetUrn.");
    }

    logger.info({
      event: "dataset_resolver_searching_by_description",
      query: request.description,
    }, `Searching dataset by description since URN was not provided or failed`);

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