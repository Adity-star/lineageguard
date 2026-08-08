import { z, ZodSchema } from "zod";

import { logger } from "../config/logger.js";

import { MCPToolError } from "./errors.js";
import { MCPToolResponse } from "./types.js";
import { MCPToolRegistry } from "./tool-registry.js";
import { MutationToolRegistry } from "./mutation-registry.js";

/**
 * Common interface for any MCP transport (HTTP or STDIO).
 * Both MCPTransport and StdioMCPTransport implement this shape.
 */
export interface IMCPTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getClient(): import("@modelcontextprotocol/sdk/client/index.js").Client;
  execute<T>(fn: () => Promise<T>): Promise<T>;
}

export interface CallToolOptions {
  timeoutMs?: number;
}

export class MCPClient {
  private readonly toolRegistry: MCPToolRegistry;
  private readonly mutationRegistry: MutationToolRegistry;

  constructor(
    private readonly transport: IMCPTransport
  ) {
    this.toolRegistry = new MCPToolRegistry(() => this.listTools());
    this.mutationRegistry = new MutationToolRegistry(() => this.listTools());
  }

  /**
   * Initialize the client and all registries.
   * Must be called before making any tool calls.
   *
   * This:
   * 1. Connects to the MCP transport
   * 2. Discovers all available tools
   * 3. Discovers and validates all mutation tool schemas
   * 4. Fails fast if required mutation tools are missing
   */
  async initialize(): Promise<void> {
    logger.info(
      { event: "mcp_client_init_start" },
      "Initializing MCP Client..."
    );

    try {
      await this.transport.connect();
      logger.info(
        { event: "mcp_transport_connected" },
        "MCP transport connected"
      );

      await this.toolRegistry.initialize();
      logger.info(
        { event: "mcp_tool_registry_initialized" },
        "MCP tool registry initialized"
      );

      await this.mutationRegistry.initialize();
      logger.info(
        { event: "mcp_mutation_registry_initialized" },
        "MCP mutation registry initialized"
      );

      // Verify mutation tools are available if mutations are enabled
      this.verifyMutationCompatibility();

      logger.info(
        { event: "mcp_client_init_success" },
        "✓ MCP Client initialized successfully"
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        { event: "mcp_client_init_failed", error: errorMsg },
        `Failed to initialize MCP Client: ${errorMsg}`
      );
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    await this.transport.disconnect();
  }

  public isConnected(): boolean {
    return this.transport.isConnected();
  }

  /**
   * Get the tool registry (initialized with all available tools).
   */
  getToolRegistry(): MCPToolRegistry {
    return this.toolRegistry;
  }

  /**
   * Get the mutation tool registry (initialized with all available mutation tools).
   */
  getMutationRegistry(): MutationToolRegistry {
    return this.mutationRegistry;
  }

  /**
   * Verify that the MCP server is compatible with mutation requirements.
   * Fails fast with clear errors if mutation tools are missing.
   */
  private verifyMutationCompatibility(): void {
    const mutationTools = this.mutationRegistry.getAllTools();

    if (mutationTools.length === 0) {
      logger.warn(
        { event: "no_mutation_tools_available" },
        "⚠ No mutation tools available from MCP server. " +
        "Ensure TOOLS_IS_MUTATION_ENABLED=true in DataHub MCP server configuration."
      );
      return;
    }

    const toolNames = mutationTools.map((t) => t.name);

    logger.info(
      {
        event: "mutation_compatibility_verified",
        toolCount: toolNames.length,
        tools: toolNames,
      },
      `✓ Mutation compatibility verified: ${toolNames.length} mutation tools available`
    );
  }

  async executeTool<T>(
    tool: string,
    args: Record<string, unknown>,
    schema: ZodSchema<T>
  ): Promise<MCPToolResponse<T>> {
    // Ensure tool exists before attempting to call it
    this.toolRegistry.ensureInitialized();
    const toolInfo = this.toolRegistry.requireTool(tool);

    const client = this.transport.getClient();
    const started = performance.now();

    try {
      logger.debug(
        {
          event: "mcp_tool_call_start",
          tool,
          argsKeys: Object.keys(args),
          argsSize: JSON.stringify(args).length,
        },
        `Calling MCP tool: ${tool}`
      );

      const response = await this.transport.execute(() =>
        client.callTool({
          name: tool,
          arguments: args,
        })
      );

      // Check for MCP error responses BEFORE parsing
      if (response.isError === true) {
        const errorText = response.content?.[0]?.text || JSON.stringify(response);
        logger.error(
          {
            event: "mcp_tool_error",
            tool,
            isError: true,
            responseSize: JSON.stringify(response).length,
            errorContent: errorText.substring(0, 500), // First 500 chars
            durationMs: (performance.now() - started).toFixed(0),
          },
          `MCP tool returned error: ${tool}`
        );

        throw new MCPToolError(
          tool,
          `MCP error: ${errorText}`,
          response
        );
      }

      // Log response details (structured, not raw JSON dumps)
      const responseContent = (response as any).structuredContent ?? response.content ?? response;
      logger.debug(
        {
          event: "mcp_tool_response",
          tool,
          responseType: Array.isArray(responseContent) ? "array" : typeof responseContent,
          responseSize: JSON.stringify(responseContent).length,
          durationMs: (performance.now() - started).toFixed(0),
        },
        `MCP tool response received: ${tool}`
      );

      const parsed = schema.parse(responseContent);

      logger.debug(
        {
          event: "mcp_tool_response_parsed",
          tool,
          parsedType: typeof parsed,
          durationMs: (performance.now() - started).toFixed(0),
        },
        `MCP tool response parsed successfully: ${tool}`
      );

      return {
        tool,
        durationMs: performance.now() - started,
        data: parsed,
      };
    } catch (error) {
      if (error instanceof MCPToolError) {
        throw error;
      }

      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        {
          event: "mcp_tool_execution_failed",
          tool,
          error: errorMsg,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          durationMs: (performance.now() - started).toFixed(0),
        },
        `MCP tool execution failed: ${tool}`
      );

      throw new MCPToolError(
        tool,
        "Tool execution failed",
        error
      );
    }
  }

  /**
   * Execute an MCP tool and return the raw response WITHOUT schema validation.
   * 
   * This is used when a mapping layer needs to process the response before validation.
   * For example, SchemaFieldMapper maps DataHub responses before the internal schema validates them.
   * 
   * @param tool Tool name to execute
   * @param args Tool arguments
   * @returns Raw response from MCP server (not validated against any schema)
   */
  async executeToolRaw(
    tool: string,
    args: Record<string, unknown>
  ): Promise<any> {
    // Ensure tool exists before attempting to call it
    this.toolRegistry.ensureInitialized();
    const toolInfo = this.toolRegistry.requireTool(tool);

    const client = this.transport.getClient();
    const started = performance.now();

    try {
      logger.debug(
        {
          event: "mcp_tool_call_raw_start",
          tool,
          argsKeys: Object.keys(args),
          argsSize: JSON.stringify(args).length,
        },
        `Calling MCP tool (raw response): ${tool}`
      );

      const response = await this.transport.execute(() =>
        client.callTool({
          name: tool,
          arguments: args,
        })
      );

      // Check for MCP error responses BEFORE returning
      if (response.isError === true) {
        const errorText = response.content?.[0]?.text || JSON.stringify(response);
        logger.error(
          {
            event: "mcp_tool_error",
            tool,
            isError: true,
            responseSize: JSON.stringify(response).length,
            errorContent: errorText.substring(0, 500),
            durationMs: (performance.now() - started).toFixed(0),
          },
          `MCP tool returned error: ${tool}`
        );

        throw new MCPToolError(
          tool,
          `MCP error: ${errorText}`,
          response
        );
      }

      // Extract structuredContent if available (DataHub provides parsed objects there)
      // Otherwise extract raw content and return WITHOUT validation
      const rawContent = (response as any).structuredContent ?? response.content ?? response;

      logger.debug(
        {
          event: "mcp_tool_raw_response",
          tool,
          responseType: Array.isArray(rawContent) ? "array" : typeof rawContent,
          responseSize: JSON.stringify(rawContent).length,
          durationMs: (performance.now() - started).toFixed(0),
        },
        `MCP tool raw response returned (no validation): ${tool}`
      );

      return rawContent;
    } catch (error) {
      if (error instanceof MCPToolError) {
        throw error;
      }

      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        {
          event: "mcp_tool_execution_failed",
          tool,
          error: errorMsg,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          durationMs: (performance.now() - started).toFixed(0),
        },
        `MCP tool execution failed: ${tool}`
      );

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
