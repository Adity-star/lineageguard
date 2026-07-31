import { DataHubClient } from "../mcp/datahub-client.js";

import { ChangeRequest } from "../mcp/types.js";

import { ContextBundle } from "./type.js";
import { ContextState, createContextState } from "./state.js";

import { DatasetResolverStage } from "./stages/data-resolver.js";
import { MetadataCollectorStage } from "./stages/data-collector.js";
import { SchemaCollectorStage } from "./stages/schema-commector.js";
import { LineageCollectorStage } from "./stages/lineage-collector.js";
import { QueryCollectorStage } from "./stages/query-collector.js";
import { DocumentationCollectorStage } from "./stages/documentation-collector.js";
import { ContextNormalizerStage } from "./stages/normalizer.js";

export class ContextEngine {

    constructor(
        private readonly dataHub: DataHubClient
    ) {}

    async buildContext(
        request: ChangeRequest
    ): Promise<ContextBundle> {

        const state = createContextState(request);

        await new DatasetResolverStage(
            this.dataHub
        ).execute(request, state);

        await new MetadataCollectorStage(
            this.dataHub
        ).execute(state);

        await new SchemaCollectorStage(
            this.dataHub
        ).execute(state);

        await new LineageCollectorStage(
            this.dataHub
        ).execute(state);

        await new QueryCollectorStage(
            this.dataHub
        ).execute(state);

        await new DocumentationCollectorStage(
            this.dataHub
        ).execute(state);

        return new ContextNormalizerStage()
            .execute(state);
    }

}