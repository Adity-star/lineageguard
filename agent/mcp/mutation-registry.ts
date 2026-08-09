import { logger } from '../config/logger.js';
import { z } from 'zod';

/**
 * Schema for a single tool parameter.
 */
export interface ToolParameter {
  name: string;
  type: string;
  description?: string;
  required: boolean;
}

/**
 * Complete schema for a mutation tool.
 */
export interface MutationToolSchema {
  name: string;
  description?: string;
  parameters: ToolParameter[];
  requiredParameters: string[];
}

/**
 * MutationToolRegistry - Discovers and caches DataHub mutation tool schemas at startup.
 *
 * This registry:
 * 1. Calls ListTools at startup to discover all mutation tools
 * 2. Caches the schema (parameter names, types, requirements) for each tool
 * 3. Validates mutation payloads against cached schemas before execution
 * 4. Fails fast with clear errors if tools are missing or schemas don't match
 * 5. Makes future MCP version upgrades painless (only update schemas, not code)
 *
 * This removes all hardcoded parameter names from the codebase.
 */
export class MutationToolRegistry {
  private tools: Map<string, MutationToolSchema> = new Map();
  private initialized: boolean = false;

  // Expected mutation tools (for validation)
  private readonly EXPECTED_MUTATION_TOOLS = [
    'add_tags',
    'remove_tags',
    'update_description',
    'add_structured_properties',
    'remove_structured_properties',
    'add_terms',
    'remove_terms',
    'add_owners',
    'remove_owners',
    'set_domains',
    'remove_domains',
    'save_document',
    'set_lifecycle_stage',
  ];

  constructor(private readonly listToolsFn: () => Promise<any>) {}

  /**
   * Initialize the registry by discovering all mutation tool schemas.
   * Must be called before any mutation operations.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug(
        { event: 'mutation_registry_already_initialized' },
        'Mutation registry already initialized',
      );
      return;
    }

    try {
      logger.info(
        { event: 'mutation_registry_init_start' },
        'Initializing DataHub Mutation Tool Registry - discovering tool schemas...',
      );

      const result = await this.listToolsFn();
      const allTools = result?.tools || [];

      // Filter to only mutation tools
      const mutationTools = allTools.filter((tool: any) =>
        this.EXPECTED_MUTATION_TOOLS.includes(tool.name),
      );

      this.tools.clear();
      for (const tool of mutationTools) {
        const schema = this.parseTool(tool);
        this.tools.set(tool.name, schema);
      }

      this.initialized = true;

      // Log discovered schemas
      this.logDiscoveredSchemas();

      // Check for critical mutation tools
      this.checkMissingTools();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        { event: 'mutation_registry_init_failed', error: errorMsg },
        `Failed to initialize mutation registry: ${errorMsg}`,
      );
      throw new Error(
        `DataHub Mutation Registry initialization failed: ${errorMsg}`,
      );
    }
  }

  /**
   * Parse a tool definition from the MCP server into our schema format.
   */
  private parseTool(tool: any): MutationToolSchema {
    const inputSchema = tool.inputSchema || {};
    const properties = inputSchema.properties || {};
    const required = inputSchema.required || [];

    const parameters: ToolParameter[] = Object.entries(properties).map(
      ([name, prop]: [string, any]) => ({
        name,
        type: prop.type || 'unknown',
        description: prop.description,
        required: required.includes(name),
      }),
    );

    return {
      name: tool.name,
      description: tool.description,
      parameters,
      requiredParameters: required,
    };
  }

  /**
   * Log all discovered mutation tool schemas in a readable format.
   */
  private logDiscoveredSchemas(): void {
    const toolNames = Array.from(this.tools.keys()).sort();

    const schemaLog = toolNames
      .map((name) => {
        const tool = this.tools.get(name)!;
        const required = tool.requiredParameters.join(', ');
        const optional = tool.parameters
          .filter((p) => !p.required)
          .map((p) => p.name)
          .join(', ');

        return (
          `\n${name}:` +
          `\n  Required: ${required || '(none)'}` +
          (optional ? `\n  Optional: ${optional}` : '')
        );
      })
      .join('');

    logger.info(
      {
        event: 'mutation_registry_schemas_discovered',
        toolCount: toolNames.length,
        tools: toolNames,
      },
      `DataHub Mutation Tool Schemas:\n${schemaLog}`,
    );
  }

  /**
   * Check if any expected mutation tools are missing from the MCP server.
   */
  private checkMissingTools(): void {
    const available = Array.from(this.tools.keys());
    const missing = this.EXPECTED_MUTATION_TOOLS.filter(
      (name) => !available.includes(name),
    );

    if (missing.length > 0) {
      logger.warn(
        {
          event: 'mutation_tools_missing',
          missingTools: missing,
          availableTools: available,
        },
        `Warning: Expected DataHub mutation tools are missing: ${missing.join(', ')}`,
      );
    } else {
      logger.info(
        {
          event: 'mutation_tools_available',
          count: available.length,
        },
        `All expected mutation tools are available`,
      );
    }
  }

  /**
   * Get the schema for a mutation tool.
   */
  getSchema(toolName: string): MutationToolSchema | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Verify a mutation tool exists and get its schema.
   * Throws if tool is not available.
   */
  requireTool(toolName: string): MutationToolSchema {
    if (!this.initialized) {
      throw new Error(
        'Mutation registry not initialized. Call initialize() first.',
      );
    }

    const tool = this.tools.get(toolName);
    if (!tool) {
      const available = Array.from(this.tools.keys());
      throw new Error(
        `DataHub mutation tool not available: "${toolName}"\n` +
          `Available mutation tools: ${available.join(', ')}\n` +
          `Make sure the DataHub MCP server is running with mutation tools enabled (TOOLS_IS_MUTATION_ENABLED=true).`,
      );
    }
    return tool;
  }

  /**
   * Validate a payload against a mutation tool's schema.
   *
   * @param toolName - The name of the mutation tool
   * @param payload - The payload to validate
   * @returns Validation result with error details if validation fails
   */
  validatePayload(
    toolName: string,
    payload: Record<string, any>,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const tool = this.requireTool(toolName);

    // Check for required parameters
    for (const required of tool.requiredParameters) {
      if (!(required in payload)) {
        errors.push(`Missing required parameter: "${required}"`);
      }
    }

    // Warn about unexpected parameters
    const allowedParams = new Set(tool.parameters.map((p) => p.name));
    for (const key of Object.keys(payload)) {
      if (!allowedParams.has(key)) {
        errors.push(
          `Unknown parameter: "${key}" (allowed: ${Array.from(allowedParams).join(', ')})`,
        );
      }
    }

    // Type validation (basic)
    for (const param of tool.parameters) {
      if (param.name in payload) {
        const value = payload[param.name];
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        // If param type is array, value should be array
        if (
          param.type === 'array' &&
          !Array.isArray(value) &&
          value !== null &&
          value !== undefined
        ) {
          errors.push(
            `Parameter "${param.name}" should be an array, got ${actualType}`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get all registered mutation tools.
   */
  getAllTools(): MutationToolSchema[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get list of all mutation tool names.
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys()).sort();
  }

  /**
   * Check if registry is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get a parameter by name from a tool schema.
   */
  getParameter(toolName: string, paramName: string): ToolParameter | undefined {
    const tool = this.tools.get(toolName);
    if (!tool) return undefined;
    return tool.parameters.find((p) => p.name === paramName);
  }

  /**
   * Get required parameters for a mutation tool.
   */
  getRequiredParameters(toolName: string): string[] {
    const tool = this.tools.get(toolName);
    return tool?.requiredParameters || [];
  }
}
