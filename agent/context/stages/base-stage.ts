import { logger } from "@/config/logger";
import { DataHubClient } from "@/mcp";

import { RawContext } from "../types";

export abstract class ContextStage {

    constructor(
        protected readonly dataHub: DataHubClient
    ) {}

    abstract readonly name: string;

    protected abstract run(
        context: RawContext
    ): Promise<RawContext>;

    async execute(
        context: RawContext
    ): Promise<RawContext> {

        logger.info({
            stage: this.name,
            message: "Starting stage"
        });

        const started = performance.now();

        try {

            const result =
                await this.run(context);

            logger.info({
                stage: this.name,
                durationMs: performance.now() - started
            });

            return result;

        } catch (error) {

            logger.error({
                stage: this.name,
                error
            });

            throw error;
        }

    }

}