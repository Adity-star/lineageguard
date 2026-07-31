import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

import {
  MCPConnectionError,
  MCPTimeoutError,
} from "./errors.js";

export interface MCPTransportOptions {
  timeoutMs?: number;
}

export class MCPTransport {
  private client: Client;

  private transport?: StreamableHTTPClientTransport;

  private connected = false;

  private readonly timeoutMs: number;

  constructor(options: MCPTransportOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 30000;

    this.client = new Client({
      name: "lineageguard",
      version: "1.0.0",
    });
  }

  public async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      logger.info("Connecting to MCP server...");

      this.transport = new StreamableHTTPClientTransport(
        new URL(env.DATAHUB_MCP_URL),
        {
          requestInit: {
            headers: {
              Authorization: `Bearer ${env.DATAHUB_MCP_TOKEN}`,
            },
          },
        }
      );

      await this.client.connect(this.transport as any);

      this.connected = true;

      logger.info("Connected to MCP server");
    } catch (error) {
      throw new MCPConnectionError(
        "Failed to establish MCP connection",
        error
      );
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.client.close();

      this.connected = false;

      logger.info("Disconnected from MCP");
    } catch (error) {
      logger.error(error);
    }
  }

  public getClient(): Client {
    if (!this.connected) {
      throw new MCPConnectionError(
        "MCP client is not connected."
      );
    }

    return this.client;
  }

  public async execute<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new MCPTimeoutError(String(this.timeoutMs)));
      }, this.timeoutMs);
    });

    return Promise.race([
      fn(),
      timeoutPromise,
    ]);
  }

  public isConnected(): boolean {
    return this.connected;
  }
}