import Anthropic from '@anthropic-ai/sdk';

import { logger } from '../config/logger.js';

export interface AnthropicConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface MessageRequest {
  system?: string;
  messages: Array<{
    role: 'user' | 'assistant';
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

export class AnthropicClient {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;

  constructor(config: AnthropicConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });

    this.model = config.model || 'claude-3-5-sonnet-20241022';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0;
  }

  async message(request: MessageRequest): Promise<MessageResponse> {
    const started = performance.now();

    try {
      logger.debug({
        event: 'anthropic_request_start',
        model: this.model,
        messageCount: request.messages.length,
      });

      const params: any = {
        model: this.model,
        messages: request.messages,
        max_tokens: request.maxTokens || this.maxTokens,
        temperature: request.temperature ?? this.temperature,
      };

      if (request.system !== undefined) {
        params.system = request.system;
      }

      const response = await this.client.messages.create(params);

      const content = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('\n');

      const result: MessageResponse = {
        content,
        model: response.model,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };

      logger.debug({
        event: 'anthropic_request_success',
        durationMs: performance.now() - started,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      });

      return result;
    } catch (error) {
      logger.error({
        event: 'anthropic_request_failed',
        durationMs: performance.now() - started,
        error,
      });

      throw new Error(
        `Anthropic API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async stream(request: MessageRequest): Promise<AsyncIterable<string>> {
    const started = performance.now();

    try {
      logger.debug({
        event: 'anthropic_stream_start',
        model: this.model,
      });

      const params: any = {
        model: this.model,
        messages: request.messages,
        max_tokens: request.maxTokens || this.maxTokens,
        temperature: request.temperature ?? this.temperature,
        stream: true,
      };

      if (request.system !== undefined) {
        params.system = request.system;
      }

      const stream = (await this.client.messages.create(params)) as any;

      async function* iterate() {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            yield event.delta.text;
          }
        }

        logger.debug({
          event: 'anthropic_stream_complete',
          durationMs: performance.now() - started,
        });
      }

      return iterate();
    } catch (error) {
      logger.error({
        event: 'anthropic_stream_failed',
        durationMs: performance.now() - started,
        error,
      });

      throw new Error(
        `Anthropic API stream failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
