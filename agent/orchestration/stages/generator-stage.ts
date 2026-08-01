import { Generator } from "../../generators/generator.js";

import { PipelineStage } from "../pipeline.js";
import { StateStore } from "../state.js";
import { MissingWorkflowStateError } from "../errors.js";
import { logger } from "../../config/logger.js";
import { PerformanceTracker } from "../../utils/performance.js";
import { IdempotencyService, withIdempotency, OperationType } from "../../utils/idempotency.js";

export class GeneratorStage implements PipelineStage {

  readonly name = "generator";

  constructor(
    private readonly generator: Generator,
    private readonly idempotencyService: IdempotencyService
  ) {}

  async execute(
    state: StateStore,
    perf?: PerformanceTracker
  ): Promise<void> {

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

    const idempotencyKey = IdempotencyService.generateKey({
      planActions: plan.actions || [],
      riskLevel: risk.overallRisk,
      riskScore: risk.score,
    });

    const generation = await withIdempotency(
      {
        key: idempotencyKey,
        operationType: OperationType.GENERATION,
      },
      async () => {
        return await this.generator.generate(
          "// Original schema placeholder",
          plan,
          risk
        );
      },
      this.idempotencyService
    );

    state.set("generation", generation);

    logger.info({
      event: "generation_complete",
      schemaGenerated: !!generation.prisma?.schema,
      migrationGenerated: !!generation.prisma?.migration,
    }, "Migration Generation Complete");

  }

}