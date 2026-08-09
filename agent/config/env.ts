import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: '.env' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  LOG_LEVEL: z.string().default('info'),

  // Groq
  GROQ_API_KEY: z.string().optional(),

  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),

  GROQ_BASE_URL: z.string().default('https://api.groq.com/openai/v1'),

  // DataHub
  DATAHUB_GMS_URL: z.string().url().default('http://localhost:8080'),

  DATAHUB_GMS_TOKEN: z.string().optional(),

  // Enable DataHub mutation tools (add_tags, update_description, etc.)
  // Must be true for the agent to write back to DataHub after analysis.
  TOOLS_IS_MUTATION_ENABLED: z.string().default('true'),

  // HTTP transport fields kept optional - STDIO transport is now used instead
  DATAHUB_MCP_URL: z.string().url().optional(),

  DATAHUB_MCP_TOKEN: z.string().optional(),

  // GitHub
  GITHUB_TOKEN: z.string().optional(),

  GITHUB_OWNER: z.string().optional(),

  GITHUB_REPOSITORY: z.string().optional(),

  GITHUB_BASE_BRANCH: z.string().default('main'),

  // Database
  DATABASE_URL: z.string().default('postgresql://lineageguard:lineageguard@localhost:5432/lineageguard'),

  // Idempotency
  IDEMPOTENCY_CLEANUP_INTERVAL_MS: z.string().default('300000'),

  IDEMPOTENCY_RETENTION_BUFFER_HOURS: z.string().default('1'),

  IDEMPOTENCY_PENDING_TIMEOUT_MINUTES: z.string().default('10'),
});

export const env = envSchema.parse(process.env);
