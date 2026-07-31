import { logger } from "../config/logger.js";
import { ChangeRequest } from "../mcp/types.js";
import { ContextBundle } from "../context/type.js";
import { ExecutionPlan } from "./types.js";
import { PlanningPromptBuilder } from "./prompt.js";

export interface LLMClient {
  generate(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string>;
}

export class Planner {
  constructor(
    private readonly llm: LLMClient,
    private readonly promptBuilder =
      new PlanningPromptBuilder()
  ) {}

  async plan(
    request: ChangeRequest,
    context: ContextBundle
  ): Promise<string> {
    const prompts = this.promptBuilder.build(
      request,
      context
    );

    logger.info({
      event: "planning_started",
      dataset: context.dataset.name,
    });

    const started = performance.now();

    try {
      const response = await this.llm.generate(
        prompts.system,
        prompts.user
      );

      logger.info({
        event: "planning_completed",
        durationMs: performance.now() - started,
      });

      return response;
    } catch (error) {
      logger.error({
        event: "planning_failed",
        error,
      });

      throw error;
    }
  }
}