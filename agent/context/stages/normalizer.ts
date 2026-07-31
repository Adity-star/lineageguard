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
                    state.documents?.length ?? 0

            }

        };

    }

}