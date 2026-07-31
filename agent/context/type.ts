import {
    Dataset,
    SchemaField,
    Lineage,
    DatasetQuery,
    Document
} from "@/mcp";

export interface RawContext {

    dataset?: Dataset;

    schema?: SchemaField[];

    lineage?: Lineage;

    queries?: DatasetQuery[];

    documents?: Document[];

}

export interface ContextBundle {

    dataset: Dataset;

    schema: SchemaField[];

    lineage: Lineage;

    queries: DatasetQuery[];

    documents: Document[];

    statistics: {

        totalFields: number;

        upstreamCount: number;

        downstreamCount: number;

        queryCount: number;

        documentCount: number;

    };

}