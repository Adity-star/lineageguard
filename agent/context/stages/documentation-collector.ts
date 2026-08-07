import { ContextStage } from "./base-stage.js";
import { ContextState } from "../state.js";
import { Document } from "../../mcp/types.js";
import { logger } from "../../config/logger.js";

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

        let documents: Document[] = [];

        try {
            documents =
                await this.dataHub.searchDocumentation(
                    state.dataset.name
                );
        } catch (err) {
            logger.warn(
                { error: err instanceof Error ? err.message : String(err) },
                "Documentation unavailable. Continuing without documentation."
            );
        }

        state.documents = documents;
    }

}