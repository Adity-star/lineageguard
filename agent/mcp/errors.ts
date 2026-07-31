import { AppError } from "@/utils/errors";

export class MCPError extends AppError {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message, "MCP_ERROR", 500);

    if (cause instanceof Error && cause.stack) {
      this.stack = cause.stack;
    }
  }
}

export class MCPConnectionError extends MCPError {
  constructor(message = "Unable to connect to MCP server", cause?: unknown) {
    super(message, cause);
    this.name = "MCPConnectionError";
  }
}

export class MCPAuthenticationError extends MCPError {
  constructor(message = "MCP authentication failed", cause?: unknown) {
    super(message, cause);
    this.name = "MCPAuthenticationError";
  }
}

export class MCPToolError extends MCPError {
  constructor(
    public readonly tool: string,
    message: string,
    cause?: unknown
  ) {
    super(`[${tool}] ${message}`, cause);
    this.name = "MCPToolError";
  }
}

export class MCPValidationError extends MCPError {
  constructor(message: string) {
    super(message);
    this.name = "MCPValidationError";
  }
}

export class MCPTimeoutError extends MCPError {
  constructor(
    public readonly timeoutMs: number
  ) {
    super(`MCP request timed out after ${timeoutMs}ms`);
    this.name = "MCPTimeoutError";
  }
}