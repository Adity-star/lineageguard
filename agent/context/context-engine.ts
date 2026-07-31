import { DataHubClient } from "@/mcp";

import { ChangeRequest } from "@/models";

import { ContextBundle, RawContext } from "./types";

import { DatasetResolverStage } from "./stages/dataset-resolver";
import { MetadataCollectorStage } from "./stages/metadata-collector";
import { SchemaCollectorStage } from "./stages/schema-collector";
import { LineageCollectorStage } from "./stages/lineage-collector";
import { QueryCollectorStage } from "./stages/query-collector";
import { DocumentationCollectorStage } from "./stages/documentation-collector";
import { ContextNormalizerStage } from "./stages/normalizer";

export class ContextEngine {

    constructor(
        private readonly dataHub: DataHubClient
    ) {}

    async buildContext(
        request: ChangeRequest
    ): Promise<ContextBundle> {

        const raw: RawContext = {};

        await new DatasetResolverStage(
            this.dataHub
        ).execute(request, raw);

        await new MetadataCollectorStage(
            this.dataHub
        ).execute(raw);

        await new SchemaCollectorStage(
            this.dataHub
        ).execute(raw);

        await new LineageCollectorStage(
            this.dataHub
        ).execute(raw);

        await new QueryCollectorStage(
            this.dataHub
        ).execute(raw);

        await new DocumentationCollectorStage(
            this.dataHub
        ).execute(raw);

        return new ContextNormalizerStage()
            .execute(raw);
    }

}