import { logger } from '../config/logger.js';
import { ChangeRequest } from '../mcp/types.js';
import { ContextBundle } from '../context/type.js';
import { ExecutionPlan } from './types.js';
import { PlanningPromptBuilder } from './prompt.js';
import { sanitizePrompt } from '../utils/security.js';

export interface LLMClient {
  generate(systemPrompt: string, userPrompt: string): Promise<string>;
}

export class Planner {
  constructor(
    private readonly llm: LLMClient,
    private readonly promptBuilder = new PlanningPromptBuilder(),
  ) {}

  async plan(request: ChangeRequest, context: ContextBundle): Promise<string> {
    const prompts = this.promptBuilder.build(request, context);

    logger.info({
      event: 'planning_started',
      dataset: context.dataset.name,
    });

    const started = performance.now();

    try {
      // Sanitize prompts to prevent prompt injection
      const sanitizedSystemPrompt = sanitizePrompt(prompts.system);
      const sanitizedUserPrompt = sanitizePrompt(prompts.user);

      const response = await this.llm.generate(
        sanitizedSystemPrompt,
        sanitizedUserPrompt,
      );

      logger.info({
        event: 'planning_completed',
        durationMs: performance.now() - started,
      });

      return response;
    } catch (error) {
      logger.error({
        event: 'planning_failed',
        error,
      });

      throw error;
    }
  }
}
