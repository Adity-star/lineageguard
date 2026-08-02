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

    const runId = state.get("runId");
    const request = state.get("request");

    // Log initial pipeline state
    logger.info({
      event: "pipeline_initializing",
      runId,
      totalStages: this.stages.length,
      stageNames: this.stages.map(s => s.name),
      requestDescription: request?.description,
      datasetUrn: request?.datasetUrn,
    }, `📋 Pipeline initializing with ${this.stages.length} stages`);

    for (let i = 0; i < this.stages.length; i++) {
      const stage = this.stages[i];
      const stageRunId = state.get("runId");
      const stageIndex = i + 1;
      const totalStages = this.stages.length;
      const stageTitle = stageTitles[stage.name] || `${stage.name.charAt(0).toUpperCase() + stage.name.slice(1)} Stage`;

      // Log state before stage execution
      const stateBefore = state.value;
      const hasContext = !!stateBefore.context;
      const hasPlan = !!stateBefore.plan;
      const hasRisk = !!stateBefore.risk;
      const hasGenerator = !!stateBefore.generator;
      const hasImpact = !!stateBefore.impact;
      const hasApproval = !!stateBefore.approval;
      const hasGithub = !!stateBefore.github;

      logger.info({
        event: "stage_executing",
        runId: stageRunId,
        stageIndex,
        totalStages,
        stageName: stage.name,
        stateBefore: {
          hasContext,
          hasPlan,
          hasRisk,
          hasGenerator,
          hasImpact,
          hasApproval,
          hasGithub,
          keysInState: Object.keys(stateBefore),
        },
      }, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶️ [${stageIndex}/${totalStages}] ${stageTitle.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
State before: context=${hasContext}, plan=${hasPlan}, risk=${hasRisk}, generator=${hasGenerator}, impact=${hasImpact}, approval=${hasApproval}, github=${hasGithub}`);

      try {
        perf?.start(stage.name);
        const stageStartTime = Date.now();

        await stage.execute(state, perf);

        const stageDuration = Date.now() - stageStartTime;
        perf?.end(stage.name);

        // Log state after stage execution
        const stateAfter = state.value;
        const contextKeys = stateAfter.context ? Object.keys(stateAfter.context).join(", ") : "none";
        const planKeys = stateAfter.plan ? Object.keys(stateAfter.plan).join(", ") : "none";
        const riskKeys = stateAfter.risk ? Object.keys(stateAfter.risk).join(", ") : "none";
        const generatorOutput = stateAfter.generator ? JSON.stringify(stateAfter.generator).substring(0, 150) + "..." : "none";
        const impactOutput = stateAfter.impact ? Object.keys(stateAfter.impact).join(", ") : "none";
        const approvalOutput = stateAfter.approval ? JSON.stringify(stateAfter.approval).substring(0, 100) + "..." : "none";

        const durationMs = perf?.get(stage.name) || 0;
        const durationStr = durationMs >= 1000 ? `${(durationMs / 1000).toFixed(2)}s` : `${durationMs.toFixed(0)}ms`;

        logger.info({
          event: "stage_completed",
          runId: stageRunId,
          stageName: stage.name,
          stageIndex,
          totalStages,
          durationMs,
          stageDuration,
          stateAfter: {
            contextKeys: contextKeys.substring(0, 100),
            planKeys: planKeys.substring(0, 100),
            riskKeys: riskKeys.substring(0, 100),
            hasGenerator: !!stateAfter.generator,
            hasImpact: !!stateAfter.impact,
            hasApproval: !!stateAfter.approval,
            keysInState: Object.keys(stateAfter),
          },
        }, `✅ [${stageIndex}/${totalStages}] ${stageTitle} COMPLETED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Duration: ${durationStr}
State after:
  Context:  ${contextKeys}
  Plan:     ${planKeys}
  Risk:     ${riskKeys}
  Generator: ${generatorOutput.substring(0, 80)}...
  Impact:   ${impactOutput}
  Approval: ${approvalOutput.substring(0, 60)}...
──────────────────────────────────`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        const errorType = error instanceof Error ? error.constructor.name : typeof error;

        logger.error({
          event: "stage_failed",
          runId: stageRunId,
          stageName: stage.name,
          stageIndex,
          totalStages,
          error: errorMessage,
          errorType,
          errorStack,
          stateKeys: Object.keys(state.value),
        }, `❌ [${stageIndex}/${totalStages}] ${stageTitle} FAILED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error Type: ${errorType}
Error: ${errorMessage}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
State at failure:
${Object.entries(state.value).map(([k, v]) => `  ${k}: ${typeof v === 'object' ? JSON.stringify(v)?.substring(0, 100) : v}`).join("\n")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        throw new Error(`Stage "${stage.name}" (${stageIndex}/${totalStages}) failed: ${errorMessage}`);
      }
    }

    logger.info({
      event: "pipeline_all_stages_completed",
      runId,
      totalStages: this.stages.length,
      finalStateKeys: Object.keys(state.value),
    }, `🎯 All ${this.stages.length} pipeline stages completed successfully`);

  }

}