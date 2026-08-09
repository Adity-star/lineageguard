import { z } from 'zod';

export const ApprovalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const ApprovalDecisionSchema = z.object({
  status: ApprovalStatusSchema,

  reviewedBy: z.string().optional(),

  reviewedAt: z.string().optional(),

  reason: z.string().optional(),
});

export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;

export const ApprovalRequestSchema = z.object({
  requestId: z.string(),

  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),

  riskScore: z.number().min(0).max(100),

  requiresApproval: z.boolean(),

  context: z.object({
    datasetName: z.string(),
    changeDescription: z.string(),
  }),
});

export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;
