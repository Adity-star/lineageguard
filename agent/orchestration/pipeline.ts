import { StateStore } from "./state.js";
import { PerformanceTracker } from "../utils/performance.js";
import { logger } from "../config/logger.js";

const stageTitles: Record<string, string> = {
  context: "Context Stage",
  planning: "Planning Stage",
  risk: "Risk Stage",
  generator: "Generator Stage",
  impact: "Impact Stage",
  approval: "Approval Stage",
  github: "GitHub Stage"
};

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

    for (let i = 0; i < this.stages.length; i++) {
      const stage = this.stages[i];
      const runId = state.get("runId");
      const stageIndex = i + 1;
      const totalStages = this.stages.length;
      const stageTitle = stageTitles[stage.name] || `${stage.name.charAt(0).toUpperCase() + stage.name.slice(1)} Stage`;

      try {
        logger.info({
          event: "stage_started",
          stage: stage.name,
          runId,
        }, `\n[${stageIndex}/${totalStages}] ${stageTitle}\n✓ Started`);

        perf?.start(stage.name);
        await stage.execute(state, perf);
        perf?.end(stage.name);

        const durationMs = perf?.get(stage.name) || 0;
        const durationStr = durationMs >= 1000 ? `${(durationMs / 1000).toFixed(2)}s` : `${durationMs.toFixed(0)}ms`;

        logger.info({
          event: "stage_completed",
          stage: stage.name,
          runId,
          durationMs,
        }, `✓ Completed (${durationStr})\n──────────────────────────────────`);

      } catch (error) {
        logger.error({
          event: "stage_failed",
          stage: stage.name,
          runId,
          error: error instanceof Error ? error.message : String(error),
        }, `Stage "${stage.name}" failed: ${error instanceof Error ? error.message : String(error)}`);
        throw new Error(`Stage "${stage.name}" failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

  }

}