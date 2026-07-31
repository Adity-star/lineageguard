import { logger } from "@/config/logger";

import { ChangeRequest, ContextBundle } from "@/models";

import { PlanningPromptBuilder } from "./prompt";

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