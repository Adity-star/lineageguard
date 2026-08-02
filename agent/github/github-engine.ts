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

    logger.info({
      event: "github_engine_starting",
      owner: request.owner,
      repository: request.repository,
      baseBranch: request.baseBranch,
      datasetName: request.context.dataset?.name,
      changeIntent: request.plan.intent,
    }, "GitHub Engine - Starting PR creation");

    const pullRequest = this.builder.build(
      request.context,
      request.plan,
      request.generation,
      request.impact
    );

    logger.info({
      event: "github_pr_built",
      branch: pullRequest.branch,
      title: pullRequest.title,
      labelsCount: pullRequest.labels.length,
      reviewersCount: pullRequest.reviewers.length,
    }, "Pull request built successfully");

    const validated =
      this.validator.validate(
        pullRequest
      );

    logger.info({
      event: "github_pr_validated",
      branch: validated.branch,
      isValid: true,
    }, "Pull request validation passed");

    const result = await withRetry(
      async () => {
        logger.info({
          event: "github_pr_creating",
          owner: request.owner,
          repository: request.repository,
          branch: validated.branch,
          title: validated.title,
        }, "Creating pull request");
        
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

    logger.info({
      event: "github_pr_created",
      prNumber: result.number,
      prUrl: result.url,
    }, `Pull request created successfully: PR #${result.number} at ${result.url}`);

    await withRetry(
      async () => {
        logger.info({
          event: "github_labels_adding",
          prNumber: result.number,
          labelCount: validated.labels.length,
        });
        
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

    logger.info({
      event: "github_labels_added",
      prNumber: result.number,
    }, "Labels added to PR");

    await withRetry(
      async () => {
        logger.info({
          event: "github_reviewers_requesting",
          prNumber: result.number,
          reviewerCount: validated.reviewers.length,
        });
        
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

    logger.info({
      event: "github_reviewers_requested",
      prNumber: result.number,
    }, "Reviewers requested for PR");

    logger.info({
      event: "github_engine_complete",
      prNumber: result.number,
      prUrl: result.url,
      branch: validated.branch,
    }, `GitHub Engine Complete - PR #${result.number}: ${result.url}`);

    return {

      number: result.number,

      url: result.url,

      branch: validated.branch

    };

  }

}