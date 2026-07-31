import { MCPClient } from "./client";

import { SearchTool } from "./tools/search";
import { EntityTool } from "./tools/entities";
import { SchemaTool } from "./tools/schema";
import { LineageTool } from "./tools/lineage";
import { QueryTool } from "./tools/queries";
import { DocumentTool } from "./tools/documents";

import {
    Dataset,
    Lineage,
    SchemaField,
    DatasetQuery,
    Document,
    SearchResult
} from "./types";

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

    async searchDatasets(
        query: string,
        limit = 10
    ): Promise<SearchResult[]> {

        const result =
            await this.search.searchDatasets(
                query,
                limit
            );

        return result.data;
    }

    async getDataset(
        urn: string
    ): Promise<Dataset> {

        const result = await this.entities.getDataset(urn);
        return result;
    }

    async getSchema(
        urn: string
    ): Promise<SchemaField[]> {

        const result =
            await this.schema.getSchema(
                urn
            );

        return result.data;
    }

    async getLineage(
        urn: string
    ): Promise<Lineage> {

        const result =
            await this.lineage.getLineage(
                urn
            );

        return result.data;
    }

    async getQueries(
        urn: string
    ): Promise<DatasetQuery[]> {

        const result =
            await this.queries.getDatasetQueries(
                urn
            );

        return result.data;
    }

    async searchDocumentation(
        query: string
    ): Promise<Document[]> {

        const result =
            await this.documents.searchDocuments(
                query
            );

        return result.data;
    }

    async resolveDataset(
        query: string
    ): Promise<Dataset | null> {

        const datasets =
            await this.searchDatasets(query, 1);

        if (datasets.length === 0)
            return null;

        const urn = datasets[0]?.urn;
        if (!urn) return null;

        return this.getDataset(urn);
    }

}