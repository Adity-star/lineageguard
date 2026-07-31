import { logger } from "../config/logger.js";

import { ContextState } from "./state.js";

export interface PipelineStage {
  readonly name: string;

  execute(
    state: ContextState
  ): Promise<ContextState>;
}

export class ContextPipeline {
  constructor(
    private readonly stages: PipelineStage[]
  ) {}

  async execute(
    initialState: ContextState
  ): Promise<ContextState> {
    let state = initialState;

    for (const stage of this.stages) {
      logger.info({
        stage: stage.name,
        message: "Running stage",
      });

      const started = performance.now();

      state = await stage.execute(state);

      state.metadata.completedStages.push(stage.name);

      logger.info({
        stage: stage.name,
        durationMs: performance.now() - started,
      });
    }

    return state;
  }
}