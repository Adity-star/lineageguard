import { ContextBundle } from "../type.js";
import { ContextState } from "../state.js";

export class ContextNormalizerStage {

    execute(
        state: ContextState
    ): ContextBundle {

        if (
            !state.dataset ||
            !state.schema ||
            !state.lineage
        ) {
            throw new Error(
                "Incomplete context."
            );
        }

        return {

            dataset: state.dataset,

            schema: state.schema,

            lineage: state.lineage,

            queries: state.queries ?? [],

            documents: state.documents ?? [],

            statistics: {

                totalFields:
                    state.schema.length,

                upstreamCount:
                    state.lineage.upstream.length,

                downstreamCount:
                    state.lineage.downstream.length,

                queryCount:
                    state.queries?.length ?? 0,

                documentCount:
                    state.documents?.length ?? 0,

                ownerCount: state.dataset?.owners?.length ?? 0,

                glossaryTermCount: 0,

                tagCount: state.dataset?.tags?.length ?? 0,

                dashboardCount: 0,

                pipelineCount: 0,

                dbtModelCount: 0

            },

            owners: state.dataset?.owners ?? [],

            glossaryTerms: [],

            tags: state.dataset?.tags ?? [],

            structuredProperties: {},

            domain: undefined,

            usage: {
                queryCount: state.queries?.length ?? 0,
            },

            quality: {
                passedChecks: 0,
                failedChecks: 0,
            },

            certification: {
                certified: false,
            },

            deprecation: {
                deprecated: false,
            },

            relatedDashboards: [],

            relatedPipelines: [],

            relatedDbtModels: [],

            provenance: {
                datasetUrn: state.dataset?.urn || "unknown",
                retrievedAt: new Date().toISOString(),
                source: "datahub",
                retrievalDurationMs: 0,
            }

        };

    }

}