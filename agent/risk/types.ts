import { z } from "zod";

export const RiskLevelSchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const FindingSeveritySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
]);

export type FindingSeverity = z.infer<
  typeof FindingSeveritySchema
>;

export const FindingCategorySchema = z.enum([
  "LINEAGE",
  "SCHEMA",
  "DOCUMENTATION",
  "GOVERNANCE",
]);

export type FindingCategory = z.infer<
  typeof FindingCategorySchema
>;

export const RiskFindingSchema = z.object({
  severity: FindingSeveritySchema,

  category: FindingCategorySchema,

  message: z.string().min(1),
});

export type RiskFinding = z.infer<
  typeof RiskFindingSchema
>;

export const AffectedAssetsSchema = z.object({
  datasets: z.number().int().min(0),

  dashboards: z.number().int().min(0),

  queries: z.number().int().min(0),
});

export type AffectedAssets = z.infer<
  typeof AffectedAssetsSchema
>;

export const RiskAssessmentSchema = z.object({
  overallRisk: RiskLevelSchema,

  score: z.number().min(0).max(100),

  affectedAssets: AffectedAssetsSchema,

  findings: z.array(RiskFindingSchema),

  recommendations: z.array(z.string()),

  requiresApproval: z.boolean(),
});

export type RiskAssessment = z.infer<
  typeof RiskAssessmentSchema
>;
