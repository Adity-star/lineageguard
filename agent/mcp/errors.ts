import { AppError } from '../utils/errors.js';

export class MCPError extends AppError {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message, 'MCP_ERROR', 500);

    if (cause instanceof Error && cause.stack) {
      (this as any).stack = cause.stack;
    }
  }
}

export class MCPConnectionError extends MCPError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    (this as any).name = 'MCPConnectionError';
  }
}

export class MCPAuthenticationError extends MCPError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    (this as any).name = 'MCPAuthenticationError';
  }
}

export class MCPToolError extends MCPError {
  constructor(tool: string, message: string, cause?: unknown) {
    super(`${tool}: ${message}`, cause);
    (this as any).name = 'MCPToolError';
  }
}

export class MCPValidationError extends MCPError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    (this as any).name = 'MCPValidationError';
  }
}

export class MCPTimeoutError extends MCPError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    (this as any).name = 'MCPTimeoutError';
  }
}
