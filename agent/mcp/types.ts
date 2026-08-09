import { z } from 'zod';

/* -------------------------------------------------- */
/* Shared */
/* -------------------------------------------------- */

export const EntityTypeSchema = z.enum([
  'dataset',
  'dashboard',
  'chart',
  'dataJob',
  'mlModel',
  'container',
  'domain',
  'tag',
  'glossaryTerm',
  'assertion',
]);

export type EntityType = z.infer<typeof EntityTypeSchema>;

export const URNSchema = z.string().min(1);

export type URN = z.infer<typeof URNSchema>;

/* -------------------------------------------------- */
/* Search */
/* -------------------------------------------------- */

export const SearchResultSchema = z.object({
  urn: URNSchema,
  name: z.string(),
  entityType: EntityTypeSchema,
  score: z.number(),
  description: z.string().optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

/* -------------------------------------------------- */
/* Schema */
/* -------------------------------------------------- */

export const SchemaFieldSchema = z.object({
  fieldPath: z.string(),
  type: z.string(),
  nullable: z.boolean(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export type SchemaField = z.infer<typeof SchemaFieldSchema>;

/* -------------------------------------------------- */
/* Ownership */
/* -------------------------------------------------- */

export const OwnerSchema = z.object({
  urn: z.string(),
  name: z.string(),
  type: z.string(),
});

export type Owner = z.infer<typeof OwnerSchema>;

/* -------------------------------------------------- */
/* Documentation */
/* -------------------------------------------------- */

export const DocumentationSchema = z.object({
  title: z.string(),
  content: z.string(),
  lastUpdated: z.string().optional(),
});

export type Documentation = z.infer<typeof DocumentationSchema>;

/* -------------------------------------------------- */
/* Dataset */
/* -------------------------------------------------- */

export const DatasetSchema = z.object({
  urn: URNSchema,

  name: z.string(),

  platform: z.string(),

  description: z.string().optional(),

  owners: z.array(OwnerSchema).default([]),

  tags: z.array(z.string()).default([]),

  glossaryTerms: z
    .array(
      z.object({
        urn: z.string(),
        name: z.string(),
        description: z.string().optional(),
      }),
    )
    .default([]),

  domain: z.string().optional(),

  quality: z
    .object({
      passedChecks: z.number().default(0),
      failedChecks: z.number().default(0),
    })
    .optional(),

  certification: z
    .object({
      certified: z.boolean().default(false),
    })
    .optional(),

  deprecation: z
    .object({
      deprecated: z.boolean().default(false),
      note: z.string().optional(),
      decommissionDate: z.string().optional(),
    })
    .optional(),
});

export type Dataset = z.infer<typeof DatasetSchema>;

/* -------------------------------------------------- */
/* Lineage */
/* -------------------------------------------------- */

export const LineageNodeSchema = z.object({
  urn: URNSchema,

  name: z.string(),

  entityType: EntityTypeSchema,
});

export type LineageNode = z.infer<typeof LineageNodeSchema>;

export const LineageSchema = z.object({
  upstream: z.array(LineageNodeSchema),

  downstream: z.array(LineageNodeSchema),
});

export type Lineage = z.infer<typeof LineageSchema>;

/* -------------------------------------------------- */
/* Queries */
/* -------------------------------------------------- */

export const DatasetQuerySchema = z.object({
  id: z.string(),

  sql: z.string(),

  lastSeen: z.string().optional(),
});

export type DatasetQuery = z.infer<typeof DatasetQuerySchema>;

/* -------------------------------------------------- */
/* Documents */
/* -------------------------------------------------- */

export const DocumentSchema = z.object({
  id: z.string(),

  title: z.string(),

  snippet: z.string(),

  url: z.string().optional(),
});

export type Document = z.infer<typeof DocumentSchema>;

/* -------------------------------------------------- */
/* Generic MCP Response */
/* -------------------------------------------------- */

export interface MCPToolResponse<T> {
  tool: string;

  durationMs: number;

  data: T;
}

/* -------------------------------------------------- */
/* Change Request                                      */
/* -------------------------------------------------- */

export interface ChangeRequest {
  /** Human-readable description of the change, e.g. "Add discount_pct column to SampleHdfsDataset" */
  description: string;

  /** DataHub dataset URN to operate on, e.g. "urn:li:dataset:(urn:li:dataPlatform:hdfs,SampleHdfsDataset,PROD)" */
  datasetUrn?: string;

  /** Email / identifier of the person requesting the change */
  requestedBy: string;

  /** Change priority – drives approval threshold */
  priority?: 'low' | 'medium' | 'high';

  /** Type of schema change: add_column | remove_column | rename_column | modify_column | create_table | drop_table */
  changeType?:
    | 'add_column'
    | 'remove_column'
    | 'rename_column'
    | 'modify_column'
    | 'create_table'
    | 'drop_table';

  /** URN of the schema entity if different from the dataset URN */
  schemaUrn?: string;

  /** Raw SQL DDL to apply (optional – agent can generate this if omitted) */
  sql?: string;

  /** Additional documentation or context to attach to the change */
  documentation?: string;

  /** Tags to apply to the change request for tracking / filtering */
  tags?: string[];
}
