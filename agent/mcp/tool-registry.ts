import { logger } from "../config/logger.js";

export interface ToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, any>;
}

/**
 * MCPToolRegistry - Discovers and caches available MCP tools at startup.
 * 
 * Prevents calling non-existent tools and provides clear errors when tools are missing.
 */
export class MCPToolRegistry {
  private tools: Map<string, ToolInfo> = new Map();
  private initialized: boolean = false;

  constructor(private readonly listToolsFn: () => Promise<any>) {}

  /**
   * Discover all available tools from the MCP server.
   * Must be called before any tool invocations.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug({ event: "tool_registry_already_initialized" }, "Tool registry already initialized");
      return;
    }

    try {
      logger.info({ event: "tool_registry_init_start" }, "Initializing MCP Tool Registry - discovering available tools...");

      const result = await this.listToolsFn();
      const toolsList = result?.tools || [];

      this.tools.clear();
      for (const tool of toolsList) {
        this.tools.set(tool.name, {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        });
      }

      this.initialized = true;

      // Log all available tools
      const toolNames = Array.from(this.tools.keys());
      logger.info({
        event: "tool_registry_initialized",
        toolCount: toolNames.length,
        tools: toolNames.sort(),
      }, `MCP Tool Registry initialized with ${toolNames.length} tools:
${toolNames.map(t => `  - ${t}`).join("\n")}`);

      // Check for critical tools
      this.checkCriticalTools();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error({
        event: "tool_registry_init_failed",
        error: errorMsg,
      }, `Failed to initialize tool registry: ${errorMsg}`);
      throw new Error(`MCP Tool Registry initialization failed: ${errorMsg}`);
    }
  }

  /**
   * Check if a tool exists before calling it.
   */
  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Get tool info if it exists.
   */
  get(toolName: string): ToolInfo | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Get all available tools.
   */
  getAll(): ToolInfo[] {
    return Array.from(this.tools.values());
  }

  /**
   * Verify a tool exists, throw if not.
   */
  requireTool(toolName: string): ToolInfo {
    const tool = this.tools.get(toolName);
    if (!tool) {
      const available = Array.from(this.tools.keys());
      throw new Error(
        `Required MCP tool not found: "${toolName}"\n` +
        `Available tools: ${available.join(", ")}\n` +
        `Make sure the DataHub MCP server is running and the tool name is correct.`
      );
    }
    return tool;
  }

  /**
   * Ensure registry is initialized before use.
   */
  ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("Tool registry not initialized. Call initialize() first.");
    }
  }

  /**
   * Check for tools critical to operation.
   */
  private checkCriticalTools(): void {
    const criticalTools = [
      "search",
      "list_schema_fields",
      "get_lineage",
    ];

    const missing = criticalTools.filter(name => !this.has(name));

    if (missing.length > 0) {
      logger.warn({
        event: "critical_tools_missing",
        missingTools: missing,
        availableTools: Array.from(this.tools.keys()),
      }, `Warning: Critical MCP tools are missing: ${missing.join(", ")}`);
    }

    const available = criticalTools.filter(name => this.has(name));
    logger.info({
      event: "critical_tools_available",
      availableCount: available.length,
      available,
    }, `Critical tools available: ${available.join(", ")}`);
  }

  /**
   * Get list of all tool names.
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys()).sort();
  }
}
