import { ContextStage } from "./base-stage";

import { RawContext } from "../types";

export class SchemaCollectorStage extends ContextStage {

    readonly name = "Schema Collector";

    protected async run(
        context: RawContext
    ): Promise<RawContext> {

        if (!context.dataset) {
            throw new Error(
                "Dataset must be resolved before schema collection."
            );
        }

        const schema =
            await this.dataHub.getSchema(
                context.dataset.urn
            );

        return {
            ...context,
            schema
        };

    }

}