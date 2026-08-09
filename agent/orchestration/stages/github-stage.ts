import { GitHubEngine } from '../../github/github-engine.js';

import { PipelineStage } from '../pipeline.js';
import { StateStore } from '../state.js';
import { MissingWorkflowStateError } from '../errors.js';
import { logger } from '../../config/logger.js';
import { PerformanceTracker } from '../../utils/performance.js';
import {
  IdempotencyService,
  withIdempotency,
  OperationType,
} from '../../utils/idempotency.js';
import { createHash } from 'crypto';

/**
 * Generate a canonical, change-specific idempotency key for GitHub PR creation
 */
function generateGitHubPRImpotencyKey(params: {
  owner: string;
  repository: string;
  baseBranch: string;
  datasetUrn: string;
  changeType: string;
  affectedColumns: string[];
  changeDescription: string;
}): string {
  // Sort affected columns to ensure deterministic ordering
  const sortedColumns = [...params.affectedColumns].sort();

  // Create a canonical representation
  const canonical = {
    repository: `${params.owner}/${params.repository}`,
    baseBranch: params.baseBranch,
    datasetUrn: params.datasetUrn,
    changeType: params.changeType,
    affectedColumns: sortedColumns,
    changeDescription: params.changeDescription.toLowerCase().trim(),
  };

  return IdempotencyService.generateKey(canonical);
}

/**
 * Generate a change-specific branch name
 */
function generateBranchName(params: {
  changeType: string;
  datasetName: string;
  affectedColumns: string[];
}): string {
  // Normalize change type
  const normalizedChangeType = params.changeType
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase();

  // Normalize dataset name
  const normalizedDataset = params.datasetName
    .replace(/\./g, '-')
    .replace(/_/g, '-')
    .toLowerCase();

  // Normalize and sort affected columns
  const normalizedColumns = params.affectedColumns
    .map((col) => col.replace(/_/g, '-').toLowerCase())
    .sort();

  // Create base branch name
  const baseBranch = `${normalizedChangeType}/${normalizedDataset}`;

  // Add columns if present
  if (normalizedColumns.length > 0) {
    const columnsPart = normalizedColumns.join('-');
    const columnsBranch = `${baseBranch}/${columnsPart}`;

    // Truncate if too long (Git refs have a limit)
    if (columnsBranch.length > 240) {
      // Use a hash of the full name
      const hash = createHash('sha256')
        .update(columnsBranch)
        .digest('hex')
        .substring(0, 8);
      return `${baseBranch}/${hash}`;
    }
    return columnsBranch;
  }

  // Add a hash for uniqueness if no columns
  const hash = createHash('sha256')
    .update(baseBranch)
    .digest('hex')
    .substring(0, 8);
  return `${baseBranch}/${hash}`;
}

export class GitHubStage implements PipelineStage {
  readonly name = 'github';

  constructor(
    private readonly engine: GitHubEngine,
    private readonly owner: string,
    private readonly repository: string,
    private readonly baseBranch: string,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async execute(state: StateStore, perf?: PerformanceTracker): Promise<void> {
    const approval = state.get('approval');
    const context = state.get('context');
    const plan = state.get('plan');
    const generation = state.get('generation');
    const impact = state.get('impact');

    if (!approval) {
      throw new MissingWorkflowStateError('approval');
    }

    if (!context) {
      throw new MissingWorkflowStateError('context');
    }

    if (!plan) {
      throw new MissingWorkflowStateError('plan');
    }

    if (!generation) {
      throw new MissingWorkflowStateError('generation');
    }

    if (!impact) {
      throw new MissingWorkflowStateError('impact');
    }

    if (approval.status !== 'APPROVED') {
      logger.info(
        {
          event: 'github_skipped_not_approved',
          approvalStatus: approval.status,
          reason: `Approval status is ${approval.status}, not APPROVED`,
        },
        `GitHub PR Creation Skipped - Approval Status: ${approval.status}`,
      );
      return;
    }

    // Extract plan details for idempotency and branch naming
    const executionPlan = plan;
    const changeType =
      executionPlan.intent || executionPlan.summary || 'schema-change';
    const affectedColumns = executionPlan.affectedColumns || [];
    const datasetUrn =
      context.dataset?.urn || context.provenance?.datasetUrn || 'unknown';
    const datasetName =
      context.dataset?.name ||
      executionPlan.affectedDataset ||
      'unknown-dataset';
    const changeDescription =
      executionPlan.summary || `${changeType} on ${datasetName}`;

    // Generate change-specific branch name
    const branchName = generateBranchName({
      changeType,
      datasetName,
      affectedColumns,
    });

    // Generate change-specific idempotency key
    const idempotencyKey = generateGitHubPRImpotencyKey({
      owner: this.owner,
      repository: this.repository,
      baseBranch: this.baseBranch,
      datasetUrn,
      changeType,
      affectedColumns,
      changeDescription,
    });

    logger.info(
      {
        event: 'github_pr_creation_identity',
        repository: `${this.owner}/${this.repository}`,
        baseBranch: this.baseBranch,
        datasetUrn,
        changeType,
        affectedColumns,
        branchName,
        idempotencyKey,
        changeDescription,
      },
      'GitHub PR Creation - Operation identity',
    );

    logger.info(
      {
        event: 'github_execution_starting',
        approvalStatus: approval.status,
        datasetName,
        changeType,
      },
      'GitHub PR Creation - Starting execution after approval',
    );

    let result;
    try {
      result = await withIdempotency(
        {
          key: idempotencyKey,
          operationType: OperationType.GITHUB_PR_CREATION,
        },
        async () => {
          return await this.engine.execute({
            owner: this.owner,
            repository: this.repository,
            baseBranch: this.baseBranch,
            context,
            plan,
            generation,
            impact,
            branchName, // Pass the pre-generated branch name
          });
        },
        this.idempotencyService,
        (res) => (res.number ? String(res.number) : undefined),
        // Add custom callback for idempotency hit logging
        (cachedResult) => {
          logger.info(
            {
              event: 'github_pr_idempotency_hit',
              currentOperation: {
                repository: `${this.owner}/${this.repository}`,
                baseBranch: this.baseBranch,
                datasetUrn,
                changeType,
                affectedColumns,
                branchName,
              },
              cachedOperation: {
                prNumber: cachedResult.number,
                prUrl: cachedResult.url,
                branch: cachedResult.branch,
              },
            },
            'GitHub PR creation idempotency hit - returning cached PR',
          );
        },
      );
    } catch (error) {
      // Log the detailed error before re-throwing
      logger.error(
        {
          event: 'github_stage_error',
          owner: this.owner,
          repository: this.repository,
          baseBranch: this.baseBranch,
          datasetName,
          datasetUrn,
          changeType,
          affectedColumns,
          branchName,
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          // Preserve the original error details
          ...(error instanceof Error && {
            stack: error.stack,
          }),
          // Extract GitHub-specific error details if available
          ...(error instanceof Error &&
            (error as any).status && { status: (error as any).status }),
          ...(error instanceof Error &&
            (error as any).statusText && {
              statusText: (error as any).statusText,
            }),
          ...(error instanceof Error &&
            (error as any).response?.data && {
              responseData: (error as any).response.data,
            }),
          // For RetryError, extract underlying error
          ...(error instanceof Error &&
            error.name === 'RetryError' && {
              retryAttempts: (error as any).attempts,
              underlyingError: (error as any).lastError
                ? {
                    name: (error as any).lastError?.name,
                    message: (error as any).lastError?.message,
                    status: (error as any).lastError?.status,
                    statusText: (error as any).lastError?.statusText,
                  }
                : undefined,
            }),
        },
        `GitHub stage failed - preserving original error details`,
      );

      // Re-throw the original error (RetryError with cause)
      throw error;
    }

    state.set('github', result);

    logger.info(
      {
        event: 'github_complete',
        prNumber: result.number,
        prUrl: result.url,
        branch: result.branch,
        datasetName,
        datasetUrn,
        changeType,
        affectedColumns,
      },
      `GitHub PR Created Successfully - PR #${result.number}: ${result.url}`,
    );
  }
}
