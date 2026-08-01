import { ContextBundle } from "../context/type.js";
import { ExecutionPlan } from "../planner/types.js";
import { GenerationResult } from "../generators/types.js";
import { ImpactReport } from "../impact/types.js";
import { logger } from "../config/logger.js";
import { withRetry, isRetryableError } from "../utils/retry.js";

import { GitHubClient } from "./github-client.js";
import { PullRequestBuilder } from "./pull-request.js";
import { GitHubValidator } from "./validator.js";

export interface GitHubEngineRequest {

  owner: string;

  repository: string;

  baseBranch: string;

  context: ContextBundle;

  plan: ExecutionPlan;

  generation: GenerationResult;

  impact: ImpactReport;

}

export interface GitHubResult {

  number: number;

  url: string;

  branch: string;

}

export class GitHubEngine {

  constructor(

    private readonly client: GitHubClient,

    private readonly builder = new PullRequestBuilder(),

    private readonly validator = new GitHubValidator()

  ) {}

  async execute(
    request: GitHubEngineRequest
  ): Promise<GitHubResult> {

    const pullRequest = this.builder.build(
      request.context,
      request.plan,
      request.generation,
      request.impact
    );

    const validated =
      this.validator.validate(
        pullRequest
      );

    const result = await withRetry(
      async () => {
        return await this.client.createPullRequest({

          owner: request.owner,

          repository: request.repository,

          baseBranch: request.baseBranch,

          headBranch: validated.branch,

          title: validated.title,

          body: validated.body,

          labels: validated.labels.map(
            label => label.name
          ),

          reviewers: validated.reviewers.map(
            reviewer => reviewer.username
          )

        });
      },
      {
        maxAttempts: 3,
        retryableErrors: isRetryableError,
        onRetry: (attempt, error) => {
          logger.warn({
            event: 'github_pr_retry',
            attempt,
            error: error instanceof Error ? error.message : String(error),
          }, 'Retrying pull request creation');
        }
      }
    );

    await withRetry(
      async () => {
        await this.client.addLabels(
          result.number,
          validated.labels.map(
            label => label.name
          )
        );
      },
      {
        maxAttempts: 2,
        retryableErrors: isRetryableError,
      }
    );

    await withRetry(
      async () => {
        await this.client.requestReviewers(
          result.number,
          validated.reviewers.map(
            reviewer => reviewer.username
          )
        );
      },
      {
        maxAttempts: 2,
        retryableErrors: isRetryableError,
      }
    );

    return {

      number: result.number,

      url: result.url,

      branch: validated.branch

    };

  }

}