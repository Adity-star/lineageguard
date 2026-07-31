import { ContextStage } from "./base-stage.js";
import { ContextState } from "../state.js";

export class DocumentationCollectorStage extends ContextStage {

    readonly name = "Documentation Collector";

    protected async run(
        state: ContextState
    ): Promise<void> {

        if (!state.dataset) {
            throw new Error(
                "Dataset must be resolved before documentation collection."
            );
        }

        const documents =
            await this.dataHub.searchDocumentation(
                state.dataset.name
            );

        state.documents = documents;
    }

}