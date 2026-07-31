import { z, ZodSchema } from "zod";

import { logger } from "@/config/logger";

import { MCPToolError } from "./errors";
import { MCPTransport } from "./transport";
import { MCPToolResponse } from "./types";

export interface CallToolOptions {
  timeoutMs?: number;
}

export class MCPClient {
  constructor(
    private readonly transport: MCPTransport
  ) {}

  async initialize(): Promise<void> {
    await this.transport.connect();
  }

  async shutdown(): Promise<void> {
    await this.transport.disconnect();
  }

  async executeTool<T>(
    tool: string,
    args: Record<string, unknown>,
    schema: ZodSchema<T>
  ): Promise<MCPToolResponse<T>> {
    const client = this.transport.getClient();

    const started = performance.now();

    try {
      logger.debug({
        tool,
        args,
      });

      const response = await this.transport.execute(() =>
        client.callTool({
          name: tool,
          arguments: args,
        })
      );

      const parsed = schema.parse(
        response.content ?? response
      );

      return {
        tool,
        durationMs: performance.now() - started,
        data: parsed,
      };
    } catch (error) {
      logger.error({
        tool,
        error,
      });

      throw new MCPToolError(
        tool,
        "Tool execution failed",
        error
      );
    }
  }

  async listTools() {
    return this.transport
      .getClient()
      .listTools();
  }

  async ping(): Promise<boolean> {
    try {
      await this.listTools();
      return true;
    } catch {
      return false;
    }
  }
}