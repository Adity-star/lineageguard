import { ContextStage } from "./base-stage";
import { ContextState } from "../state";

export class DocumentationCollectorStage extends ContextStage {

    readonly name = "Documentation Collector";

    protected async run(
        state: ContextState
    ): Promise<ContextState> {

        if (!state.dataset) {
            throw new Error(
                "Dataset must be resolved before documentation collection."
            );
        }

        const documents =
            await this.dataHub.searchDocumentation(
                state.dataset.name
            );

        return {
            ...state,
            documents
        };

    }

}