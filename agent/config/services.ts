import { IdempotencyService } from "../utils/idempotency.js";

export interface Services {
  mcp: unknown;

  github: unknown;

  anthropic: unknown;

  idempotency: IdempotencyService;
}

export const services: Partial<Services> = {};