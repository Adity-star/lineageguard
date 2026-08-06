import { z } from "zod";

/**
 * DDL (Data Definition Language) generated for a specific platform.
 * Replaces PrismaArtifact for codegen path (Prisma stays internal to agent only).
 */
export const DDLArtifactSchema = z.object({
  /** The DDL statement(s) to execute */
  ddl: z.string().min(1),

  /** Platform this DDL targets (snowflake, postgres, bigquery, mysql, redshift, tsql) */
  platform: z.string(),

  /** Table/entity name being modified */
  tableName: z.string(),

  /** Validation status: "validated" if tested, "generated" if not yet validated */
  validationStatus: z.enum(["validated", "generated", "unvalidated"]),

  /** Validation errors if applicable */
  validationErrors: z.array(z.string()).optional(),

  /** Number of fields/columns in the schema */
  fieldCount: z.number(),

  /** Platform-specific notes or warnings */
  notes: z.array(z.string()).optional(),
});

export type DDLArtifact = z.infer<typeof DDLArtifactSchema>;

/**
 * SQL artifact for DDL statements.
 * Now used for platform-aware SQL generation instead of Prisma.
 */
export const SQLArtifactSchema = z.object({
  migration: z.string(),

  formatted: z.string(),

  /** Platform the SQL targets */
  platform: z.string().optional(),
});

export type SQLArtifact = z.infer<typeof SQLArtifactSchema>;

/**
 * Rollback instructions.
 */
export const RollbackArtifactSchema = z.object({
  sql: z.string(),

  automatic: z.boolean(),
});

export type RollbackArtifact = z.infer<
  typeof RollbackArtifactSchema
>;

/**
 * Markdown documentation.
 */
export const DocumentationArtifactSchema =
  z.object({
    markdown: z.string(),
  });

export type DocumentationArtifact =
  z.infer<typeof DocumentationArtifactSchema>;

/**
 * Optional dbt changes.
 */
export const DbtArtifactSchema = z.object({
  files: z.array(z.string()),
});

export type DbtArtifact = z.infer<
  typeof DbtArtifactSchema
>;

/**
 * Final output of the Code Generation Engine.
 * Now uses DDLArtifact instead of PrismaArtifact for external entity DDL.
 */
export const GenerationResultSchema = z.object({
  /** Platform-aware DDL generation (replaces prisma) */
  ddl: DDLArtifactSchema,

  sql: SQLArtifactSchema,

  rollback: RollbackArtifactSchema,

  documentation:
    DocumentationArtifactSchema,

  dbt: DbtArtifactSchema.optional(),
});

export type GenerationResult = z.infer<
  typeof GenerationResultSchema
>;