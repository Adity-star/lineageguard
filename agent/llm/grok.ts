import OpenAI from "openai";

import { logger } from "../config/logger.js";

export interface GrokConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseURL?: string;
}

export interface MessageRequest {
  system?: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  maxTokens?: number;
  temperature?: number;
}

export interface MessageResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class GrokClient {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;

  constructor(config: GrokConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL ?? "https://api.groq.com/openai/v1",
    });

    this.model = config.model ?? "llama-3.3-70b-versatile";
    this.maxTokens = config.maxTokens ?? 4096;
    this.temperature = config.temperature ?? 0;
  }

  async message(request: MessageRequest): Promise<MessageResponse> {
    const started = performance.now();

    try {
      logger.debug({
        event: "grok_request_start",
        model: this.model,
        messageCount: request.messages.length,
      });

      const messages = [];

      if (request.system) {
        messages.push({
          role: "system" as const,
          content: request.system,
        });
      }

      messages.push(...request.messages);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: request.maxTokens ?? this.maxTokens,
        temperature: request.temperature ?? this.temperature,
      });

      const result: MessageResponse = {
        content: response.choices[0]?.message?.content ?? "",
        model: response.model,
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
      };

      logger.debug({
        event: "grok_request_success",
        durationMs: performance.now() - started,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      });

      return result;
    } catch (error) {
      logger.error({
        event: "grok_request_failed",
        durationMs: performance.now() - started,
        error,
      });

      throw new Error(
        `Grok API request failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async stream(request: MessageRequest): Promise<AsyncIterable<string>> {
    const started = performance.now();

    try {
      logger.debug({
        event: "grok_stream_start",
        model: this.model,
      });

      const messages = [];

      if (request.system) {
        messages.push({
          role: "system" as const,
          content: request.system,
        });
      }

      messages.push(...request.messages);

      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: request.maxTokens ?? this.maxTokens,
        temperature: request.temperature ?? this.temperature,
        stream: true,
      });

      async function* iterate() {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;

          if (text) {
            yield text;
          }
        }

        logger.debug({
          event: "grok_stream_complete",
          durationMs: performance.now() - started,
        });
      }

      return iterate();
    } catch (error) {
      logger.error({
        event: "grok_stream_failed",
        durationMs: performance.now() - started,
        error,
      });

      throw new Error(
        `Grok API stream failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}