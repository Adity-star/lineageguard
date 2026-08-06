import { MCPClient } from "./client.js";
import { SearchTool } from "./tools/search.js";
import { EntityTool } from "./tools/entities.js";
import { SchemaTool } from "./tools/schema.js";
import { LineageTool } from "./tools/lineage.js";
import { QueryTool } from "./tools/queries.js";
import { DocumentTool } from "./tools/documents.js";
import { MutationTool, MutationResult } from "./tools/mutations.js";
import { logger } from "../config/logger.js";

import {
    Dataset,
    Lineage,
    SchemaField,
    DatasetQuery,
    Document,
    SearchResult,
} from "./types.js";

export type { MutationResult };

export class DataHubClient {

    readonly search: SearchTool;
    readonly entities: EntityTool;
    readonly schema: SchemaTool;
    readonly lineage: LineageTool;
    readonly queries: QueryTool;
    readonly documents: DocumentTool;
    readonly mutations: MutationTool;

    constructor(private readonly client: MCPClient) {
        this.search    = new SearchTool(client);
        this.entities  = new EntityTool(client);
        this.schema    = new SchemaTool(client);
        this.lineage   = new LineageTool(client);
        this.queries   = new QueryTool(client);
        this.documents = new DocumentTool(client);
        this.mutations = new MutationTool(client, client.getMutationRegistry());
    }

    async initialize() { await this.client.initialize(); }
    async shutdown()   { await this.client.shutdown();   }
    isConnected(): boolean { return this.client.isConnected(); }
    
    /**
     * Check if DataHub is reachable by attempting a ping
     */
    async ping(): Promise<boolean> {
        return this.client.ping();
    }

    // ----------------------------------------------------------------
    // Read methods
    // ----------------------------------------------------------------

    async searchDatasets(query: string, limit = 10): Promise<SearchResult[]> {
        logger.info({ event: "datahub_search_datasets_start", query }, `Searching dataset: "${query}"...`);
        const start = performance.now();
        try {
            const result = await this.search.searchDatasets(query, limit);
            logger.info({ event: "datahub_search_datasets_success", durationMs: (performance.now() - start).toFixed(0) }, `Retrieved ${result.data?.length || 0} datasets`);
            return result.data;
        } catch (error) {
            logger.error({ event: "datahub_search_datasets_failed", error: error instanceof Error ? error.message : String(error) }, `Searching dataset failed`);
            throw error;
        }
    }

    async getDataset(urn: string): Promise<Dataset> {
        logger.info({ 
            event: "datahub_get_dataset_start", 
            urn,
            isConnected: this.isConnected(),
        }, `Getting dataset: "${urn}"...`);
        const start = performance.now();
        try {
            const result = await this.entities.getDataset(urn);
            logger.info({ 
                event: "datahub_get_dataset_success", 
                durationMs: (performance.now() - start).toFixed(0),
                datasetName: result.name,
                datasetUrn: result.urn,
            }, `Retrieved dataset: ${result.name}`);
            return result;
        } catch (error) {
            const durationMs = (performance.now() - start).toFixed(0);
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            logger.error({ 
                event: "datahub_get_dataset_failed", 
                urn,
                durationMs,
                error: errorMessage,
                errorType: error instanceof Error ? error.constructor.name : typeof error,
                isConnected: this.isConnected(),
            }, `Getting dataset failed: ${errorMessage}`);
            throw error;
        }
    }

    async getOwners(urn: string): Promise<Array<{ urn: string; name: string; type: string }>> {
        logger.info({ event: "datahub_get_owners_start", urn }, `Getting owners...`);
        const start = performance.now();
        try {
            const result = await this.entities.getOwners(urn);
            logger.info({ event: "datahub_get_owners_success", durationMs: (performance.now() - start).toFixed(0) }, `Retrieved owners`);
            return result;
        } catch (error) {
            logger.error({ event: "datahub_get_owners_failed", error: error instanceof Error ? error.message : String(error) }, `Getting owners failed`);
            throw error;
        }
    }

    async getGlossaryTerms(urn: string): Promise<Array<{ urn: string; name: string; description?: string }>> {
        logger.info({ event: "datahub_get_glossary_terms_start", urn }, `Getting glossary terms...`);
        const start = performance.now();
        try {
            const result = await this.entities.getGlossaryTerms(urn);
            logger.info({ event: "datahub_get_glossary_terms_success", durationMs: (performance.now() - start).toFixed(0) }, `Retrieved glossary terms`);
            return result;
        } catch (error) {
            logger.error({ event: "datahub_get_glossary_terms_failed", error: error instanceof Error ? error.message : String(error) }, `Getting glossary terms failed`);
            throw error;
        }
    }

    async getTags(urn: string): Promise<string[]> {
        logger.info({ event: "datahub_get_tags_start", urn }, `Getting tags...`);
        const start = performance.now();
        try {
            const result = await this.entities.getTags(urn);
            logger.info({ event: "datahub_get_tags_success", durationMs: (performance.now() - start).toFixed(0) }, `Retrieved tags`);
            return result;
        } catch (error) {
            logger.error({ event: "datahub_get_tags_failed", error: error instanceof Error ? error.message : String(error) }, `Getting tags failed`);
            throw error;
        }
    }

    async getStructuredProperties(urn: string): Promise<Record<string, any>> {
        return this.entities.getStructuredProperties(urn);
    }

    async getDomain(urn: string): Promise<{ urn: string; name: string; description?: string } | undefined> {
        return this.entities.getDomain(urn);
    }

    async getRelatedDashboards(urn: string): Promise<Array<{ urn: string; name: string; url?: string }>> {
        logger.info({ event: "datahub_get_related_dashboards_start", urn }, `Getting related dashboards...`);
        const start = performance.now();
        try {
            const result = await this.entities.getRelatedDashboards(urn);
            logger.info({ event: "datahub_get_related_dashboards_success", durationMs: (performance.now() - start).toFixed(0) }, `Retrieved dashboards`);
            return result;
        } catch (error) {
            logger.error({ event: "datahub_get_related_dashboards_failed", error: error instanceof Error ? error.message : String(error) }, `Getting dashboards failed`);
            throw error;
        }
    }

    async getRelatedPipelines(urn: string): Promise<Array<{ urn: string; name: string; platform: string }>> {
        logger.info({ event: "datahub_get_related_pipelines_start", urn }, `Getting related pipelines...`);
        const start = performance.now();
        try {
            const result = await this.entities.getRelatedPipelines(urn);
            logger.info({ event: "datahub_get_related_pipelines_success", durationMs: (performance.now() - start).toFixed(0) }, `Retrieved pipelines`);
            return result;
        } catch (error) {
            logger.error({ event: "datahub_get_related_pipelines_failed", error: error instanceof Error ? error.message : String(error) }, `Getting pipelines failed`);
            throw error;
        }
    }

    async getRelatedDbtModels(urn: string): Promise<Array<{ urn: string; name: string; package: string }>> {
        return this.entities.getRelatedDbtModels(urn);
    }

    async getSchema(urn: string): Promise<SchemaField[]> {
        logger.info({ event: "datahub_get_schema_start", urn }, `Getting schema...`);
        const start = performance.now();
        try {
            const result = await this.schema.getSchema(urn);
            logger.info({ event: "datahub_get_schema_success", durationMs: (performance.now() - start).toFixed(0) }, `Retrieved schema`);
            return result.data;
        } catch (error) {
            logger.error({ event: "datahub_get_schema_failed", error: error instanceof Error ? error.message : String(error) }, `Getting schema failed`);
            throw error;
        }
    }

    async getLineage(urn: string): Promise<Lineage> {
        logger.info({ event: "datahub_get_lineage_start", urn }, `Getting lineage...`);
        const start = performance.now();
        try {
            const result = await this.lineage.getLineage(urn);
            logger.info({ event: "datahub_get_lineage_success", durationMs: (performance.now() - start).toFixed(0) }, `Retrieved lineage`);
            return result.data;
        } catch (error) {
            logger.error({ event: "datahub_get_lineage_failed", error: error instanceof Error ? error.message : String(error) }, `Getting lineage failed`);
            throw error;
        }
    }

    async getQueries(urn: string): Promise<DatasetQuery[]> {
        logger.info({ event: "datahub_get_queries_start", urn }, `Getting queries...`);
        const start = performance.now();
        try {
            const result = await this.queries.getDatasetQueries(urn);
            logger.info({ event: "datahub_get_queries_success", durationMs: (performance.now() - start).toFixed(0) }, `Retrieved queries`);
            return result.data;
        } catch (error) {
            logger.error({ event: "datahub_get_queries_failed", error: error instanceof Error ? error.message : String(error) }, `Getting queries failed`);
            throw error;
        }
    }

    async searchDocumentation(query: string): Promise<Document[]> {
        logger.info({ event: "datahub_search_documentation_start", query }, `Searching documentation...`);
        const start = performance.now();
        try {
            const result = await this.documents.searchDocuments(query);
            logger.info({ event: "datahub_search_documentation_success", durationMs: (performance.now() - start).toFixed(0) }, `Retrieved documentation`);
            return result.data;
        } catch (error) {
            logger.error({ event: "datahub_search_documentation_failed", error: error instanceof Error ? error.message : String(error) }, `Searching documentation failed`);
            throw error;
        }
    }

    async resolveDataset(query: string): Promise<Dataset | null> {
        logger.info({ event: "datahub_resolve_dataset_start", query }, `Resolving dataset: "${query}"...`);
        const start = performance.now();
        try {
            const datasets = await this.searchDatasets(query, 1);
            if (datasets.length === 0) {
                logger.warn({ event: "datahub_resolve_dataset_empty" }, `No dataset found matching: "${query}"`);
                return null;
            }
            const urn = datasets[0]?.urn;
            if (!urn) {
                logger.warn({ event: "datahub_resolve_dataset_no_urn" }, `Found dataset has no URN`);
                return null;
            }
            const dataset = await this.getDataset(urn);
            logger.info({ event: "datahub_resolve_dataset_success", durationMs: (performance.now() - start).toFixed(0) }, `Dataset resolved`);
            return dataset;
        } catch (error) {
            logger.error({ event: "datahub_resolve_dataset_failed", error: error instanceof Error ? error.message : String(error) }, `Resolving dataset failed`);
            throw error;
        }
    }

    // ----------------------------------------------------------------
    // Write / Mutation methods
    // ----------------------------------------------------------------

    /**
     * Update the description of a dataset or a specific schema field.
     * mode: "overwrite" (default) | "append" | "remove"
     */
    async updateDescription(
        urn: string,
        description: string,
        fieldPath?: string,
        mode: "overwrite" | "append" | "remove" = "overwrite"
    ): Promise<MutationResult> {
        const start = performance.now();
        try {
            const result = await this.mutations.updateDescription(urn, description, fieldPath, mode);
            logger.info({ event: "datahub_update_description_success", urn, fieldPath, mode, durationMs: (performance.now() - start).toFixed(0) }, `✏️ Description updated on ${urn}`);
            return result;
        } catch (error) {
            logger.error({ event: "datahub_update_description_failed", urn, error: error instanceof Error ? error.message : String(error) }, `Updating description failed`);
            throw error;
        }
    }

    /**
     * Add tags to a dataset or column.
     * tags: array of tag URNs e.g. ["urn:li:tag:PII", "urn:li:tag:lineageguard_reviewed"]
     */
    async addTags(urn: string, tags: string[], fieldPath?: string): Promise<MutationResult> {
        const start = performance.now();
        try {
            const result = await this.mutations.addTags(urn, tags, fieldPath);
            logger.info({ event: "datahub_add_tags_success", urn, tags, fieldPath, durationMs: (performance.now() - start).toFixed(0) }, `🏷️ Tags added to ${urn}`);
            return result;
        } catch (error) {
            logger.error({ event: "datahub_add_tags_failed", urn, error: error instanceof Error ? error.message : String(error) }, `Adding tags failed`);
            throw error;
        }
    }

    /**
     * Add glossary terms to a dataset or column.
     * terms: array of glossary term URNs e.g. ["urn:li:glossaryTerm:Revenue"]
     */
    async addTerms(urn: string, terms: string[], fieldPath?: string): Promise<MutationResult> {
        const start = performance.now();
        try {
            const result = await this.mutations.addTerms(urn, terms, fieldPath);
            logger.info({ event: "datahub_add_terms_success", urn, terms, fieldPath, durationMs: (performance.now() - start).toFixed(0) }, `📖 Glossary terms added to ${urn}`);
            return result;
        } catch (error) {
            logger.error({ event: "datahub_add_terms_failed", urn, error: error instanceof Error ? error.message : String(error) }, `Adding glossary terms failed`);
            throw error;
        }
    }

    /**
     * Add owners to a dataset.
     * owners: array of { ownerUrn, ownershipType? }
     * ownershipType: "TECHNICAL_OWNER" | "BUSINESS_OWNER" | "DATA_STEWARD" | "NONE"
     */
    async addOwners(urn: string, owners: Array<{ ownerUrn: string; ownershipType?: string }>): Promise<MutationResult> {
        const start = performance.now();
        try {
            const result = await this.mutations.addOwners(urn, owners);
            logger.info({ event: "datahub_add_owners_success", urn, count: owners.length, durationMs: (performance.now() - start).toFixed(0) }, `👤 ${owners.length} owner(s) added to ${urn}`);
            return result;
        } catch (error) {
            logger.error({ event: "datahub_add_owners_failed", urn, error: error instanceof Error ? error.message : String(error) }, `Adding owners failed`);
            throw error;
        }
    }

    /**
     * Assign a domain to a dataset.
     * domainUrn: e.g. "urn:li:domain:engineering"
     */
    async setDomain(urn: string, domainUrn: string): Promise<MutationResult> {
        const start = performance.now();
        try {
            const result = await this.mutations.setDomain(urn, domainUrn);
            logger.info({ event: "datahub_set_domain_success", urn, domainUrn, durationMs: (performance.now() - start).toFixed(0) }, `🗂️ Domain set on ${urn}`);
            return result;
        } catch (error) {
            logger.error({ event: "datahub_set_domain_failed", urn, error: error instanceof Error ? error.message : String(error) }, `Setting domain failed`);
            throw error;
        }
    }

    /**
     * Write structured (typed) properties onto a dataset.
     * properties: map of property URN → value(s)
     */
    async addStructuredProperties(
        urn: string,
        properties: Record<string, string | number | string[] | number[]>
    ): Promise<MutationResult> {
        const start = performance.now();
        try {
            const result = await this.mutations.addStructuredProperties(urn, properties);
            logger.info({ event: "datahub_add_structured_props_success", urn, keys: Object.keys(properties), durationMs: (performance.now() - start).toFixed(0) }, `🗃️ Structured properties written to ${urn}`);
            return result;
        } catch (error) {
            logger.error({ event: "datahub_add_structured_props_failed", urn, error: error instanceof Error ? error.message : String(error) }, `Writing structured properties failed`);
            throw error;
        }
    }
}
