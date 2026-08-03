import OpenAI from "openai";
import { logger } from "../config/logger.js";
import { LLMClient } from "../planner/planner.js";

export interface GrokConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
}

export class GrokLLMAdapter implements LLMClient {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: GrokConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL ?? "https://api.groq.com/openai/v1",
    });

    this.model = config.model ?? "llama-3.3-70b-versatile";
  }

  async generate(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    logger.info({ event: "llm_request_send", model: this.model }, "Sending prompt to Grok...");
    const start = performance.now();
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.2,
      });

      const durationSec = ((performance.now() - start) / 1000).toFixed(1);
      const totalTokens = response.usage?.total_tokens ?? 0;

      logger.info({
        event: "llm_response_received",
        model: this.model,
        tokens: totalTokens,
        durationSeconds: Number(durationSec),
      }, `Response received... Tokens: ${totalTokens}, Duration: ${durationSec}s`);

      return response.choices[0]?.message?.content ?? "";
    } catch (error) {
      logger.error(
        { err: error },
        "Failed to generate response using Grok"
      );
      throw error;
    }
  }
}