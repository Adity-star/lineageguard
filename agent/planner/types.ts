import { z } from "zod";

/**
 * Individual change that should be executed.
 */
export const PlannedChangeSchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1),
});

export type PlannedChange = z.infer<typeof PlannedChangeSchema>;

/**
 * Final execution plan returned by the Planning Engine.
 */
export const ExecutionPlanSchema = z.object({
  summary: z.string().min(1),

  intent: z.string().min(1),

  affectedDataset: z.string().min(1),

  affectedColumns: z.array(z.string()),

  assumptions: z.array(z.string()),

  missingInformation: z.array(z.string()),

  requiredChanges: z.array(PlannedChangeSchema),

  confidence: z.number().min(0).max(1),

  requiresApproval: z.boolean(),

  platform: z.string().optional(),

  schemaName: z.string().optional(),
});

export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

/**
 * Planning engine response.
 */
export interface PlanningResult {
  plan: ExecutionPlan;

  generatedAt: Date;

  model: string;

  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}