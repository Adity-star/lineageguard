import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),

  LOG_LEVEL: z.string(),

  ANTHROPIC_API_KEY: z.string(),

  DATAHUB_GMS_URL: z.string().url(),

  DATAHUB_GMS_TOKEN: z.string(),

  GITHUB_TOKEN: z.string(),

  GITHUB_OWNER: z.string(),

  GITHUB_REPOSITORY: z.string(),

  SUPABASE_URL: z.string().url(),

  SUPABASE_ANON_KEY: z.string(),

  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  DATABASE_URL: z.string()
});

export const env = envSchema.parse(process.env);