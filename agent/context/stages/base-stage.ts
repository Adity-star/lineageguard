import { logger } from "../../config/logger.js";
import { DataHubClient } from "../../mcp/datahub-client.js";
import { ContextState } from "../state.js";

export abstract class ContextStage {

    constructor(
        protected readonly dataHub: DataHubClient
    ) {}

    abstract readonly name: string;

    protected abstract run(
        state: ContextState
    ): Promise<void>;

    async execute(
        state: ContextState
    ): Promise<void> {

        logger.info({
            stage: this.name,
            message: "Starting stage"
        });

        const started = performance.now();

        try {

            await this.run(state);

            logger.info({
                stage: this.name,
                durationMs: performance.now() - started
            });

        } catch (error) {

            logger.error({
                stage: this.name,
                error
            });

            throw error;
        }

    }

}