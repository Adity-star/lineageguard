import { logger } from "@/config/logger";
import { ChangeRequest, ContextBundle } from "@/models";

import { Planner } from "./planner";
import { PlanningParser } from "./parser";
import { PlanningValidator } from "./validator";
import { PlanningResult } from "./types";

export class PlanningEngine {
  constructor(
    private readonly planner: Planner,
    private readonly parser = new PlanningParser(),
    private readonly validator = new PlanningValidator()
  ) {}

  async plan(
    request: ChangeRequest,
    context: ContextBundle
  ): Promise<PlanningResult> {
    logger.info({
      event: "planning_engine_started",
      dataset: context.dataset.name,
    });

    const rawResponse = await this.planner.plan(
      request,
      context
    );

    const parsed = this.parser.parse(rawResponse);

    const validated = this.validator.validate(parsed);

    logger.info({
      event: "planning_engine_completed",
      confidence: validated.confidence,
      requiresApproval: validated.requiresApproval,
    });

    return {
      plan: validated,
      generatedAt: new Date(),
      model: "claude",
    };
  }
}