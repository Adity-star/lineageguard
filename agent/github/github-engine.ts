import { ContextBundle } from '../context/type.js';
import { ExecutionPlan } from '../planner/types.js';
import { GenerationResult } from '../generators/types.js';
import { ImpactReport } from '../impact/types.js';
import { logger } from '../config/logger.js';
import { withRetry, isRetryableError } from '../utils/retry.js';

import { GitHubClient } from './github-client.js';
import { PullRequestBuilder } from './pull-request.js';
import { BranchBuilder } from './branch.js';
import { GitHubValidator } from './validator.js';

export interface GitHubEngineRequest {
  owner: string;

  repository: string;

  baseBranch: string;

  context: ContextBundle;

  plan: ExecutionPlan;

  generation: GenerationResult;

  impact: ImpactReport;

  branchName?: string; // Optional pre-generated branch name
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

    private readonly branchBuilder = new BranchBuilder(),

    private readonly validator = new GitHubValidator(),
  ) {}

  async execute(request: GitHubEngineRequest): Promise<GitHubResult> {
    logger.info(
      {
        event: 'github_engine_starting',
        owner: request.owner,
        repository: request.repository,
        baseBranch: request.baseBranch,
        datasetName: request.context.dataset?.name,
        changeIntent: request.plan.intent,
      },
      'GitHub Engine - Starting PR creation',
    );

    // Step 1: Build the feature branch name (use pre-generated if provided)
    const headBranch =
      request.branchName || this.branchBuilder.build(request.plan);

    logger.info(
      {
        event: 'github_branch_name_generated',
        headBranch,
        baseBranch: request.baseBranch,
        preGenerated: !!request.branchName,
      },
      `Feature branch name: ${headBranch}`,
    );

    // Step 2: Check if feature branch already exists
    let branchExists = false;
    try {
      const branchCheck = await this.client.getBranch({
        owner: request.owner,
        repository: request.repository,
        branch: headBranch,
      });
      branchExists = branchCheck.exists;

      if (branchExists) {
        logger.info(
          {
            event: 'github_branch_exists',
            headBranch,
            sha: branchCheck.sha,
          },
          `Feature branch already exists: ${headBranch}`,
        );
      }
    } catch (error) {
      this.logGitHubError(error, request, 'getBranch');
      // Continue - we'll try to create the branch
    }

    // Step 3: Create feature branch if it doesn't exist
    if (!branchExists) {
      try {
        await this.client.createBranch({
          owner: request.owner,
          repository: request.repository,
          baseBranch: request.baseBranch,
          newBranch: headBranch,
        });

        logger.info(
          {
            event: 'github_branch_create_success',
            headBranch,
            baseBranch: request.baseBranch,
          },
          `Feature branch created: ${headBranch}`,
        );
      } catch (error) {
        this.logGitHubError(error, request, 'createBranch');
        throw error; // Re-throw the original error
      }
    }

    // Step 4: Commit generated files to the feature branch
    try {
      // Generate the SQL file content
      const sqlContent = request.generation.ddl.ddl;
      const documentationContent = request.generation.documentation.markdown;
      const rollbackContent = request.generation.rollback.sql;

      // Commit SQL file
      await this.client.commitFile({
        owner: request.owner,
        repository: request.repository,
        branch: headBranch,
        path: 'migration.sql',
        content: sqlContent,
        message: `Add migration for ${request.context.dataset?.name}`,
      });

      // Commit documentation file
      await this.client.commitFile({
        owner: request.owner,
        repository: request.repository,
        branch: headBranch,
        path: 'DOCUMENTATION.md',
        content: documentationContent,
        message: `Add documentation for ${request.context.dataset?.name}`,
      });

      // Commit rollback file
      await this.client.commitFile({
        owner: request.owner,
        repository: request.repository,
        branch: headBranch,
        path: 'ROLLBACK.sql',
        content: rollbackContent,
        message: `Add rollback script for ${request.context.dataset?.name}`,
      });

      logger.info(
        {
          event: 'github_files_committed',
          headBranch,
          fileCount: 3,
        },
        `Committed 3 files to branch: ${headBranch}`,
      );
    } catch (error) {
      this.logGitHubError(error, request, 'commitFiles');
      throw error; // Re-throw the original error
    }

    // Step 5: Verify the branch exists before PR creation
    try {
      const verifyBranch = await this.client.getBranch({
        owner: request.owner,
        repository: request.repository,
        branch: headBranch,
      });

      if (!verifyBranch.exists) {
        const error = new Error(
          `GitHub feature branch was not created: ${request.owner}/${request.repository}:${headBranch}`,
        );
        logger.error(
          {
            event: 'github_branch_verification_failed',
            owner: request.owner,
            repository: request.repository,
            headBranch,
          },
          error.message,
        );
        throw error;
      }

      logger.info(
        {
          event: 'github_branch_verified',
          headBranch,
          sha: verifyBranch.sha,
        },
        `Branch verified: ${headBranch} (SHA: ${verifyBranch.sha})`,
      );
    } catch (error) {
      this.logGitHubError(error, request, 'verifyBranch');
      throw error; // Re-throw the original error
    }

    // Step 6: Check if PR already exists
    try {
      const prCheck = await this.client.checkPullRequestExists({
        owner: request.owner,
        repository: request.repository,
        headBranch: headBranch,
        baseBranch: request.baseBranch,
      });

      if (prCheck.exists) {
        logger.info(
          {
            event: 'github_pr_exists',
            prNumber: prCheck.number,
            prUrl: prCheck.url,
            headBranch,
            baseBranch: request.baseBranch,
          },
          `PR already exists: #${prCheck.number} at ${prCheck.url}`,
        );

        return {
          number: prCheck.number!,
          url: prCheck.url!,
          branch: headBranch,
        };
      }
    } catch (error) {
      this.logGitHubError(error, request, 'checkPullRequestExists');
      // Continue - we'll try to create the PR
    }

    // Step 7: Build the pull request
    const pullRequest = this.builder.build(
      request.context,
      request.plan,
      request.generation,
      request.impact,
    );

    logger.info(
      {
        event: 'github_pr_built',
        branch: pullRequest.branch,
        title: pullRequest.title,
        labelsCount: pullRequest.labels.length,
        reviewersCount: pullRequest.reviewers.length,
      },
      'Pull request built successfully',
    );

    const validated = this.validator.validate(pullRequest);

    logger.info(
      {
        event: 'github_pr_validated',
        branch: validated.branch,
        isValid: true,
      },
      'Pull request validation passed',
    );

    // Step 8: Create the pull request
    let result;
    try {
      result = await withRetry(
        async () => {
          logger.info(
            {
              event: 'github_pr_creating',
              owner: request.owner,
              repository: request.repository,
              branch: validated.branch,
              title: validated.title,
              headBranch: headBranch,
              baseBranch: request.baseBranch,
            },
            'Creating pull request',
          );

          return await this.client.createPullRequest({
            owner: request.owner,

            repository: request.repository,

            baseBranch: request.baseBranch,

            headBranch: headBranch,

            title: validated.title,

            body: validated.body,

            labels: validated.labels.map((label: any) => label.name),

            reviewers: validated.reviewers.map((reviewer: any) => reviewer.username),
          });
        },
        {
          maxAttempts: 3,
          retryableErrors: isRetryableError,
          onRetry: (attempt, error) => {
            logger.warn(
              {
                event: 'github_pr_retry',
                attempt,
                error: error instanceof Error ? error.message : String(error),
              },
              'Retrying pull request creation',
            );
          },
        },
      );
    } catch (error) {
      // Log the detailed GitHub error before re-throwing
      this.logGitHubError(error, request, 'createPullRequest');
      throw error; // Re-throw the original error (RetryError with cause)
    }

    logger.info(
      {
        event: 'github_pr_created',
        prNumber: result.number,
        prUrl: result.url,
      },
      `Pull request created successfully: PR #${result.number} at ${result.url}`,
    );

    // Step 9: Add labels
    try {
      await withRetry(
        async () => {
          logger.info({
            event: 'github_labels_adding',
            prNumber: result.number,
            labelCount: validated.labels.length,
          });

          await this.client.addLabels(
            result.number,
            validated.labels.map((label: any) => label.name),
          );
        },
        {
          maxAttempts: 2,
          retryableErrors: isRetryableError,
        },
      );
    } catch (error) {
      this.logGitHubError(error, request, 'addLabels');
      throw error; // Re-throw the original error
    }

    logger.info(
      {
        event: 'github_labels_added',
        prNumber: result.number,
      },
      'Labels added to PR',
    );

    // Step 10: Request reviewers
    try {
      await withRetry(
        async () => {
          logger.info({
            event: 'github_reviewers_requesting',
            prNumber: result.number,
            reviewerCount: validated.reviewers.length,
          });

          await this.client.requestReviewers(
            result.number,
            validated.reviewers.map((reviewer: any) => reviewer.username),
          );
        },
        {
          maxAttempts: 2,
          retryableErrors: isRetryableError,
        },
      );
    } catch (error) {
      this.logGitHubError(error, request, 'requestReviewers');
      throw error; // Re-throw the original error
    }

    logger.info(
      {
        event: 'github_reviewers_requested',
        prNumber: result.number,
      },
      'Reviewers requested for PR',
    );

    logger.info(
      {
        event: 'github_engine_complete',
        prNumber: result.number,
        prUrl: result.url,
        branch: validated.branch,
      },
      `GitHub Engine Complete - PR #${result.number}: ${result.url}`,
    );

    return {
      number: result.number,

      url: result.url,

      branch: headBranch,
    };
  }

  /**
   * Log detailed GitHub error information for debugging.
   */
  private logGitHubError(
    error: any,
    request: GitHubEngineRequest,
    operation: string,
  ): void {
    const errorDetails: any = {
      event: 'github_operation_failed',
      operation,
      owner: request.owner,
      repository: request.repository,
      branch: request.baseBranch,
      datasetName: request.context.dataset?.name,
    };

    // Extract error details from various error types
    if (error instanceof Error) {
      errorDetails.errorName = error.name;
      errorDetails.errorMessage = error.message;
      errorDetails.stack = error.stack;
    }

    // GitHub API specific error details
    if (error.status) {
      errorDetails.status = error.status;
    }
    if (error.statusText) {
      errorDetails.statusText = error.statusText;
    }
    if (error.response) {
      errorDetails.responseData = error.response.data;
    }
    if (error.githubError) {
      errorDetails.githubError = error.githubError;
    }

    // For RetryError, extract the underlying error
    if (error.name === 'RetryError' && error.lastError) {
      errorDetails.retryAttempts = error.attempts;
      errorDetails.underlyingError = {
        name: error.lastError?.name,
        message: error.lastError?.message,
        status: error.lastError?.status,
        statusText: error.lastError?.statusText,
        responseData: error.lastError?.response?.data,
      };
    }

    logger.error(errorDetails, `GitHub operation failed: ${operation}`);
  }
}
