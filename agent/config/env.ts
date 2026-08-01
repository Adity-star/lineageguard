import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: ".env.local" });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),

  LOG_LEVEL: z.string(),

  ANTHROPIC_API_KEY: z.string(),

  DATAHUB_GMS_URL: z.string().url(),

  DATAHUB_GMS_TOKEN: z.string(),

  DATAHUB_MCP_URL: z.string().url(),

  DATAHUB_MCP_TOKEN: z.string(),

  GITHUB_TOKEN: z.string(),

  GITHUB_OWNER: z.string(),

  GITHUB_REPOSITORY: z.string(),

  GITHUB_BASE_BRANCH: z.string().default("main"),

  DATABASE_URL: z.string(),

  // Idempotency configuration
  IDEMPOTENCY_CLEANUP_INTERVAL_MS: z.string().default("300000"),
  IDEMPOTENCY_RETENTION_BUFFER_HOURS: z.string().default("1"),
  IDEMPOTENCY_PENDING_TIMEOUT_MINUTES: z.string().default("10"),
});

export const env = envSchema.parse(process.env);