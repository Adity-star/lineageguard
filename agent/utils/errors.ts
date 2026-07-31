export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 500
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
  }
}

export class MCPError extends AppError {
  constructor(message: string) {
    super(message, "MCP_ERROR");
  }
}

export class LLMError extends AppError {
  constructor(message: string) {
    super(message, "LLM_ERROR");
  }
}