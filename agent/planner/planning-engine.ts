import { logger } from "../config/logger.js";
import { ChangeRequest } from "../mcp/types.js";
import { ContextBundle } from "../context/type.js";

import { Planner } from "./planner.js";
import { PlanningParser } from "./parser.js";
import { PlanningValidator } from "./validator.js";
import { PlanningResult } from "./types.js";

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

    logger.info({ event: "planning_execution_plan_created" }, "✓ Execution Plan Created");

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