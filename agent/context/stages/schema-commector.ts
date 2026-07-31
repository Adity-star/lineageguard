import { ContextStage } from "./base-stage.js";
import { ContextState } from "../state.js";

export class SchemaCollectorStage extends ContextStage {

    readonly name = "Schema Collector";

    protected async run(
        state: ContextState
    ): Promise<void> {

        if (!state.dataset) {
            throw new Error(
                "Dataset must be resolved before schema collection."
            );
        }

        const schema =
            await this.dataHub.getSchema(
                state.dataset.urn
            );

        state.schema = schema;
    }

}