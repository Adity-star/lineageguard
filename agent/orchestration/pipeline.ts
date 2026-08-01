import { StateStore } from "./state";
import { PerformanceTracker } from "../utils/performance.js";

/**
 * A single executable workflow stage.
 */
export interface PipelineStage {

  /**
   * Human-readable stage name.
   */
  readonly name: string;

  /**
   * Execute this stage.
   */
  execute(
    state: StateStore,
    perf?: PerformanceTracker
  ): Promise<void>;

}

/**
 * Executes stages sequentially.
 */
export class Pipeline {

  constructor(
    private readonly stages: PipelineStage[]
  ) {}

  async execute(
    state: StateStore,
    perf?: PerformanceTracker
  ): Promise<void> {

    for (const stage of this.stages) {
      try {
        perf?.start(stage.name);
        await stage.execute(state, perf);
        perf?.end(stage.name);
      } catch (error) {
        throw new Error(`Stage "${stage.name}" failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

  }

}