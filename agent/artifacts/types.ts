import { z } from 'zod';

export const ChecklistItemSchema = z.object({
  title: z.string().min(1),
  completed: z.boolean().default(false),
});

export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const MigrationArtifactsSchema = z.object({
  summary: z.string(),

  sql: z.string(),

  rollback: z.string(),

  pullRequest: z.string(),

  checklist: z.array(ChecklistItemSchema),
});

export type MigrationArtifacts = z.infer<typeof MigrationArtifactsSchema>;
