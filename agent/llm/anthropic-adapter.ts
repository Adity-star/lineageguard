import { AnthropicClient, AnthropicConfig, MessageRequest } from "./anthropic.js";
import { logger } from "../config/logger.js";
import { LLMClient } from "../planner/planner.js";

/**
 * Adapter that makes AnthropicClient compatible with the LLMClient interface
 */
export class AnthropicLLMAdapter implements LLMClient {
  constructor(
    private readonly client: AnthropicClient
  ) {}

  async generate(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const request: MessageRequest = {
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    };

    const response = await this.client.message(request);
    return response.content;
  }
}
