import { logger } from '../config/logger.js';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: any
  ) {
    super(message, { cause: lastError });
    this.name = 'RetryError';
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    retryableErrors = () => true,
    onRetry,
  } = options;

  let lastError: any;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !retryableErrors(error)) {
        throw new RetryError(
          `Operation failed after ${attempt} attempt(s)`,
          attempt,
          error
        );
      }

      logger.warn({
        event: 'retry_attempt',
        attempt,
        maxAttempts,
        delayMs: delay,
        error: error instanceof Error ? error.message : String(error),
      });

      onRetry?.(attempt, error);

      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw new RetryError(
    `Operation failed after ${maxAttempts} attempt(s)`,
    maxAttempts,
    lastError
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableError(error: any): boolean {
  if (!error) return false;

  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
    return true;
  }

  // HTTP 5xx errors
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  // Rate limiting
  if (error.status === 429) {
    return true;
  }

  // Timeout errors
  if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
    return true;
  }

  return false;
}
