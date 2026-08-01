import { Generator } from "../../generators/generator.js";

import { PipelineStage } from "../pipeline.js";
import { StateStore } from "../state.js";
import { MissingWorkflowStateError } from "../errors.js";
import { logger } from "../../config/logger.js";
import { PerformanceTracker } from "../../utils/performance.js";

export class GeneratorStage implements PipelineStage {

  readonly name = "generator";

  constructor(
    private readonly generator: Generator
  ) {}

  async execute(
    state: StateStore,
    perf?: PerformanceTracker
  ): Promise<void> {

    logger.info({ event: "generation_started" }, "Migration Generation Started");

    const context = state.get("context");
    const plan = state.get("plan");
    const risk = state.get("risk");

    if (!context) {
      throw new MissingWorkflowStateError("context");
    }

    if (!plan) {
      throw new MissingWorkflowStateError("plan");
    }

    if (!risk) {
      throw new MissingWorkflowStateError("risk");
    }

    const generation = await this.generator.generate(
      "// Original schema placeholder",
      plan,
      risk
    );

    state.set("generation", generation);

    logger.info({
      event: "generation_complete",
      schemaGenerated: !!generation.prisma?.schema,
      migrationGenerated: !!generation.prisma?.migration,
    }, "Migration Generation Complete");

  }

}