import { z } from "zod";

export const PullRequestLabelSchema = z.object({
  name: z.string(),
  color: z.string(),
});

export type PullRequestLabel =
  z.infer<typeof PullRequestLabelSchema>;

export const ReviewerSchema = z.object({
  username: z.string(),
});

export type Reviewer =
  z.infer<typeof ReviewerSchema>;

export const PullRequestSchema = z.object({

  branch: z.string(),

  title: z.string(),

  body: z.string(),

  labels: z.array(
    PullRequestLabelSchema
  ),

  reviewers: z.array(
    ReviewerSchema
  ),

});

export type PullRequest =
  z.infer<typeof PullRequestSchema>;