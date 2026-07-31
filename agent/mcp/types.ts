import { z } from "zod";

/* -------------------------------------------------- */
/* Shared */
/* -------------------------------------------------- */

export const EntityTypeSchema = z.enum([
  "dataset",
  "dashboard",
  "chart",
  "dataJob",
  "mlModel",
  "container",
  "domain",
  "tag",
  "glossaryTerm",
  "assertion"
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
  description: z.string().optional()
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
  tags: z.array(z.string()).default([])
});

export type SchemaField = z.infer<typeof SchemaFieldSchema>;

/* -------------------------------------------------- */
/* Ownership */
/* -------------------------------------------------- */

export const OwnerSchema = z.object({
  urn: z.string(),
  name: z.string(),
  type: z.string()
});

export type Owner = z.infer<typeof OwnerSchema>;

/* -------------------------------------------------- */
/* Documentation */
/* -------------------------------------------------- */

export const DocumentationSchema = z.object({
  title: z.string(),
  content: z.string(),
  lastUpdated: z.string().optional()
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

  glossaryTerms: z.array(z.string()).default([]),

  domain: z.string().optional()
});

export type Dataset = z.infer<typeof DatasetSchema>;

/* -------------------------------------------------- */
/* Lineage */
/* -------------------------------------------------- */

export const LineageNodeSchema = z.object({
  urn: URNSchema,

  name: z.string(),

  entityType: EntityTypeSchema
});

export type LineageNode = z.infer<typeof LineageNodeSchema>;

export const LineageSchema = z.object({
  upstream: z.array(LineageNodeSchema),

  downstream: z.array(LineageNodeSchema)
});

export type Lineage = z.infer<typeof LineageSchema>;

/* -------------------------------------------------- */
/* Queries */
/* -------------------------------------------------- */

export const DatasetQuerySchema = z.object({
  id: z.string(),

  sql: z.string(),

  lastSeen: z.string().optional()
});

export type DatasetQuery = z.infer<typeof DatasetQuerySchema>;

/* -------------------------------------------------- */
/* Documents */
/* -------------------------------------------------- */

export const DocumentSchema = z.object({
  id: z.string(),

  title: z.string(),

  snippet: z.string(),

  url: z.string().optional()
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
/* Change Request */
/* -------------------------------------------------- */

export interface ChangeRequest {
  description: string;
  datasetUrn?: string;
  requestedBy: string;
  priority?: 'low' | 'medium' | 'high';
}