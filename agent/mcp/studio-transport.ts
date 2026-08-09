import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

import { logger } from '../config/logger.js';

import { MCPConnectionError, MCPTimeoutError } from './errors.js';

export interface StdioMCPTransportOptions {
  timeoutMs?: number;

  /**
   * MCP server executable.
   * Example:
   *  mcp-server-datahub
   */
  command?: string;

  /**
   * Optional command line arguments.
   */
  args?: string[];

  /**
   * Optional environment variables.
   */
  env?: Record<string, string>;
}

export class StdioMCPTransport {
  private readonly client: Client;

  private transport?: StdioClientTransport;

  private connected = false;

  private readonly timeoutMs: number;

  private readonly command: string;

  private readonly args: string[];

  private readonly environment: Record<string, string>;

  constructor(options: StdioMCPTransportOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 30000;

    this.command = options.command ?? 'mcp-server-datahub';

    this.args = options.args ?? [];

    this.environment = {
      ...process.env,
      ...(options.env ?? {}),
    } as Record<string, string>;

    this.client = new Client({
      name: 'lineageguard',
      version: '1.0.0',
    });
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      logger.info(
        {
          command: this.command,
          args: this.args,
        },
        'Starting DataHub MCP Server (STDIO)',
      );

      this.transport = new StdioClientTransport({
        command: this.command,
        args: this.args,
        env: this.environment,
      });

      await this.client.connect(this.transport);

      this.connected = true;

      logger.info('Connected to DataHub MCP Server');
    } catch (error) {
      throw new MCPConnectionError(
        'Failed to connect to DataHub MCP Server',
        error,
      );
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.client.close();

      this.connected = false;

      logger.info('Disconnected from DataHub MCP Server');
    } catch (error) {
      logger.error(error, 'Failed to disconnect MCP');
    }
  }

  getClient(): Client {
    if (!this.connected) {
      throw new MCPConnectionError('MCP client is not connected.');
    }

    return this.client;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new MCPTimeoutError(String(this.timeoutMs)));
      }, this.timeoutMs);
    });

    return Promise.race([fn(), timeoutPromise]);
  }

  isConnected(): boolean {
    return this.connected;
  }
}
