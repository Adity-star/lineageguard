import { MCPClient } from "./client.js";

import { SearchTool } from "./tools/search.js";
import { EntityTool } from "./tools/entities.js";
import { SchemaTool } from "./tools/schema.js";
import { LineageTool } from "./tools/lineage.js";
import { QueryTool } from "./tools/queries.js";
import { DocumentTool } from "./tools/documents.js";
import { logger } from "../config/logger.js";

import {
    Dataset,
    Lineage,
    SchemaField,
    DatasetQuery,
    Document,
    SearchResult
} from "./types.js";

export class DataHubClient {

    readonly search: SearchTool;

    readonly entities: EntityTool;

    readonly schema: SchemaTool;

    readonly lineage: LineageTool;

    readonly queries: QueryTool;

    readonly documents: DocumentTool;

    constructor(
        private readonly client: MCPClient
    ) {

        this.search = new SearchTool(client);

        this.entities = new EntityTool(client);

        this.schema = new SchemaTool(client);

        this.lineage = new LineageTool(client);

        this.queries = new QueryTool(client);

        this.documents = new DocumentTool(client);
    }

    async initialize() {
        await this.client.initialize();
    }

    async shutdown() {
        await this.client.shutdown();
    }

    public isConnected(): boolean {
        return this.client.isConnected();
    }

    // Search
    async searchDatasets(
        query: string,
        limit = 10
    ): Promise<SearchResult[]> {
        logger.info({ event: "datahub_search_datasets_start", query }, `Searching dataset: "${query}"...`);
        const start = performance.now();
        try {
            const result =
                await this.search.searchDatasets(
                    query,
                    limit
                );
            const duration = (performance.now() - start).toFixed(0);
            logger.info({ event: "datahub_search_datasets_success", durationMs: duration }, `Retrieved ${result.data?.length || 0} datasets in ${duration}ms`);
            return result.data;
        } catch (error) {
            logger.error({ event: "datahub_search_datasets_failed", error: error instanceof Error ? error.message : String(error) }, `Searching dataset failed`);
            throw error;
        }
    }

    // Dataset
    async getDataset(
        urn: string
    ): Promise<Dataset> {
        logger.info({ event: "datahub_get_dataset_start", urn }, `Getting dataset: "${urn}"...`);
        const start = performance.now();
        try {
            const result = await this.entities.getDataset(urn);
            const duration = (performance.now() - start).toFixed(0);
            logger.info({ event: "datahub_get_dataset_success", durationMs: duration }, `Retrieved dataset in ${duration}ms`);
            return result;
        } catch (error) {
            logger.error({ event: "datahub_get_dataset_failed", error: error instanceof Error ? error.message : String(error) }, `Getting dataset failed`);
            throw error;
        }
    }

    async getOwners(
        urn: string
    ): Promise<Array<{ urn: string; name: string; type: string }>> {
        logger.info({ event: "datahub_get_owners_start", urn }, `Getting owners...`);
        const start = performance.now();
        try {
            const result = await this.entities.getOwners(urn);
            const duration = (performance.now() - start).toFixed(0);
            logger.info({ event: "datahub_get_owners_success", durationMs: duration }, `Retrieved owners in ${duration}ms`);
            return result;
        } catch (error) {
            logger.error({ event: "datahub_get_owners_failed", error: error instanceof Error ? error.message : String(error) }, `Getting owners failed`);
            throw error;
        }
    }

    async getGlossaryTerms(
        urn: string
    ): Promise<Array<{ urn: string; name: string; description?: string }>> {
        logger.info({ event: "datahub_get_glossary_terms_start", urn }, `Getting glossary terms...`);
        const start = performance.now();
        try {
            const result = await this.entities.getGlossaryTerms(urn);
            const duration = (performance.now() - start).toFixed(0);
            logger.info({ event: "datahub_get_glossary_terms_success", durationMs: duration }, `Retrieved glossary terms in ${duration}ms`);
            return result;
        } catch (error) {
            logger.error({ event: "datahub_get_glossary_terms_failed", error: error instanceof Error ? error.message : String(error) }, `Getting glossary terms failed`);
            throw error;
        }
    }

    async getTags(
        urn: string
    ): Promise<string[]> {
        logger.info({ event: "datahub_get_tags_start", urn }, `Getting tags...`);
        const start = performance.now();
        try {
            const result = await this.entities.getTags(urn);
            const duration = (performance.now() - start).toFixed(0);
            logger.info({ event: "datahub_get_tags_success", durationMs: duration }, `Retrieved tags in ${duration}ms`);
            return result;
        } catch (error) {
            logger.error({ event: "datahub_get_tags_failed", error: error instanceof Error ? error.message : String(error) }, `Getting tags failed`);
            throw error;
        }
    }

    async getStructuredProperties(
        urn: string
    ): Promise<Record<string, any>> {
        return this.entities.getStructuredProperties(urn);
    }

    async getDomain(
        urn: string
    ): Promise<{ urn: string; name: string; description?: string } | undefined> {
        return this.entities.getDomain(urn);
    }

    async getRelatedDashboards(
        urn: string
    ): Promise<Array<{ urn: string; name: string; url?: string }>> {
        logger.info({ event: "datahub_get_related_dashboards_start", urn }, `Getting related dashboards...`);
        const start = performance.now();
        try {
            const result = await this.entities.getRelatedDashboards(urn);
            const duration = (performance.now() - start).toFixed(0);
            logger.info({ event: "datahub_get_related_dashboards_success", durationMs: duration }, `Retrieved dashboards in ${duration}ms`);
            return result;
        } catch (error) {
            logger.error({ event: "datahub_get_related_dashboards_failed", error: error instanceof Error ? error.message : String(error) }, `Getting dashboards failed`);
            throw error;
        }
    }

    async getRelatedPipelines(
        urn: string
    ): Promise<Array<{ urn: string; name: string; platform: string }>> {
        logger.info({ event: "datahub_get_related_pipelines_start", urn }, `Getting related pipelines...`);
        const start = performance.now();
        try {
            const result = await this.entities.getRelatedPipelines(urn);
            const duration = (performance.now() - start).toFixed(0);
            logger.info({ event: "datahub_get_related_pipelines_success", durationMs: duration }, `Retrieved pipelines in ${duration}ms`);
            return result;
        } catch (error) {
            logger.error({ event: "datahub_get_related_pipelines_failed", error: error instanceof Error ? error.message : String(error) }, `Getting pipelines failed`);
            throw error;
        }
    }

    async getRelatedDbtModels(
        urn: string
    ): Promise<Array<{ urn: string; name: string; package: string }>> {
        return this.entities.getRelatedDbtModels(urn);
    }

    // Schema
    async getSchema(
        urn: string
    ): Promise<SchemaField[]> {
        logger.info({ event: "datahub_get_schema_start", urn }, `Getting schema...`);
        const start = performance.now();
        try {
            const result =
                await this.schema.getSchema(
                    urn
                );
            const duration = (performance.now() - start).toFixed(0);
            logger.info({ event: "datahub_get_schema_success", durationMs: duration }, `Retrieved schema in ${duration}ms`);
            return result.data;
        } catch (error) {
            logger.error({ event: "datahub_get_schema_failed", error: error instanceof Error ? error.message : String(error) }, `Getting schema failed`);
            throw error;
        }
    }

    // Lineage
    async getLineage(
        urn: string
    ): Promise<Lineage> {
        logger.info({ event: "datahub_get_lineage_start", urn }, `Getting lineage...`);
        const start = performance.now();
        try {
            const result =
                await this.lineage.getLineage(
                    urn
                );
            const duration = (performance.now() - start).toFixed(0);
            logger.info({ event: "datahub_get_lineage_success", durationMs: duration }, `Retrieved lineage in ${duration}ms`);
            return result.data;
        } catch (error) {
            logger.error({ event: "datahub_get_lineage_failed", error: error instanceof Error ? error.message : String(error) }, `Getting lineage failed`);
            throw error;
        }
    }

    // Queries
    async getQueries(
        urn: string
    ): Promise<DatasetQuery[]> {
        logger.info({ event: "datahub_get_queries_start", urn }, `Getting queries...`);
        const start = performance.now();
        try {
            const result =
                await this.queries.getDatasetQueries(
                    urn
                );
            const duration = (performance.now() - start).toFixed(0);
            logger.info({ event: "datahub_get_queries_success", durationMs: duration }, `Retrieved queries in ${duration}ms`);
            return result.data;
        } catch (error) {
            logger.error({ event: "datahub_get_queries_failed", error: error instanceof Error ? error.message : String(error) }, `Getting queries failed`);
            throw error;
        }
    }

    // Documentation
    async searchDocumentation(
        query: string
    ): Promise<Document[]> {
        logger.info({ event: "datahub_search_documentation_start", query }, `Searching documentation...`);
        const start = performance.now();
        try {
            const result =
                await this.documents.searchDocuments(
                    query
                );
            const duration = (performance.now() - start).toFixed(0);
            logger.info({ event: "datahub_search_documentation_success", durationMs: duration }, `Retrieved documentation in ${duration}ms`);
            return result.data;
        } catch (error) {
            logger.error({ event: "datahub_search_documentation_failed", error: error instanceof Error ? error.message : String(error) }, `Searching documentation failed`);
            throw error;
        }
    }

    // Utility
    async resolveDataset(
        query: string
    ): Promise<Dataset | null> {
        logger.info({ event: "datahub_resolve_dataset_start", query }, `Resolving dataset: "${query}"...`);
        const start = performance.now();
        try {
            const datasets =
                await this.searchDatasets(query, 1);

            if (datasets.length === 0) {
                logger.warn({ event: "datahub_resolve_dataset_empty" }, `No dataset found matching: "${query}"`);
                return null;
            }

            const urn = datasets[0]?.urn;
            if (!urn) {
                logger.warn({ event: "datahub_resolve_dataset_no_urn" }, `Found dataset has no URN for: "${query}"`);
                return null;
            }

            const dataset = await this.getDataset(urn);
            const duration = (performance.now() - start).toFixed(0);
            logger.info({ event: "datahub_resolve_dataset_success", durationMs: duration }, `Dataset resolved in ${duration}ms`);
            return dataset;
        } catch (error) {
            logger.error({ event: "datahub_resolve_dataset_failed", error: error instanceof Error ? error.message : String(error) }, `Resolving dataset failed`);
            throw error;
        }
    }

}