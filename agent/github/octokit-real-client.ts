import { Octokit } from '@octokit/rest';
import { logger } from '../config/logger.js';
import {
  GitHubClient,
  CreatePullRequestRequest,
  PullRequestResponse,
  CreateBranchRequest,
  GetBranchRequest,
  GetBranchResponse,
  CommitFileRequest,
  CheckPullRequestRequest,
  PullRequestExistsResponse,
} from './github-client.js';

/**
 * Real GitHub client implementation using Octokit
 */
export class OctokitRealClient implements GitHubClient {
  private readonly octokit: Octokit;

  constructor(
    private readonly token: string,
    private readonly owner: string,
    private readonly repository: string,
  ) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  async createPullRequest(
    request: CreatePullRequestRequest,
  ): Promise<PullRequestResponse> {
    try {
      logger.info({
        event: 'github_pr_create_start',
        owner: this.owner,
        repository: this.repository,
        headBranch: request.headBranch,
        title: request.title,
      });

      const response = await this.octokit.rest.pulls.create({
        owner: this.owner,
        repo: this.repository,
        title: request.title,
        body: request.body,
        head: request.headBranch,
        base: request.baseBranch,
      });

      const result: PullRequestResponse = {
        number: response.data.number,
        url: response.data.html_url,
      };

      logger.info({
        event: 'github_pr_create_success',
        prNumber: result.number,
        prUrl: result.url,
      });

      return result;
    } catch (error) {
      logger.error({
        event: 'github_pr_create_failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async addLabels(prNumber: number, labels: string[]): Promise<void> {
    try {
      logger.info({
        event: 'github_labels_add_start',
        prNumber,
        labels,
      });

      await this.octokit.rest.issues.addLabels({
        owner: this.owner,
        repo: this.repository,
        issue_number: prNumber,
        labels,
      });

      logger.info({
        event: 'github_labels_add_success',
        prNumber,
        labels,
      });
    } catch (error) {
      logger.error({
        event: 'github_labels_add_failed',
        prNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async requestReviewers(prNumber: number, reviewers: string[]): Promise<void> {
    try {
      logger.info({
        event: 'github_reviewers_request_start',
        prNumber,
        reviewers,
      });

      await this.octokit.rest.pulls.requestReviewers({
        owner: this.owner,
        repo: this.repository,
        pull_number: prNumber,
        reviewers,
      });

      logger.info({
        event: 'github_reviewers_request_success',
        prNumber,
        reviewers,
      });
    } catch (error) {
      logger.error({
        event: 'github_reviewers_request_failed',
        prNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async createBranch(request: CreateBranchRequest): Promise<void> {
    try {
      logger.info({
        event: 'github_branch_create_start',
        owner: request.owner,
        repository: request.repository,
        baseBranch: request.baseBranch,
        newBranch: request.newBranch,
      });

      // Get the base branch reference and SHA
      const baseRef = await this.octokit.rest.git.getRef({
        owner: request.owner,
        repo: request.repository,
        ref: `heads/${request.baseBranch}`,
      });

      const baseSha = baseRef.data.object.sha;

      logger.info({
        event: 'github_base_branch_resolved',
        baseBranch: request.baseBranch,
        baseSha,
      });

      // Create the new branch from the base SHA
      await this.octokit.rest.git.createRef({
        owner: request.owner,
        repo: request.repository,
        ref: `refs/heads/${request.newBranch}`,
        sha: baseSha,
      });

      logger.info({
        event: 'github_branch_created',
        owner: request.owner,
        repository: request.repository,
        newBranch: request.newBranch,
        baseSha,
      });
    } catch (error) {
      logger.error({
        event: 'github_branch_create_failed',
        owner: request.owner,
        repository: request.repository,
        baseBranch: request.baseBranch,
        newBranch: request.newBranch,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getBranch(request: GetBranchRequest): Promise<GetBranchResponse> {
    try {
      logger.info({
        event: 'github_branch_get_start',
        owner: request.owner,
        repository: request.repository,
        branch: request.branch,
      });

      const response = await this.octokit.rest.git.getRef({
        owner: request.owner,
        repo: request.repository,
        ref: `heads/${request.branch}`,
      });

      logger.info({
        event: 'github_branch_get_success',
        owner: request.owner,
        repository: request.repository,
        branch: request.branch,
        sha: response.data.object.sha,
      });

      return {
        exists: true,
        sha: response.data.object.sha,
      };
    } catch (error: any) {
      if (error.status === 404) {
        logger.info({
          event: 'github_branch_not_found',
          owner: request.owner,
          repository: request.repository,
          branch: request.branch,
        });
        return { exists: false };
      }

      logger.error({
        event: 'github_branch_get_failed',
        owner: request.owner,
        repository: request.repository,
        branch: request.branch,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async commitFile(request: CommitFileRequest): Promise<void> {
    try {
      logger.info({
        event: 'github_file_commit_start',
        owner: request.owner,
        repository: request.repository,
        branch: request.branch,
        path: request.path,
      });

      // Get the current branch SHA
      const branchRef = await this.octokit.rest.git.getRef({
        owner: request.owner,
        repo: request.repository,
        ref: `heads/${request.branch}`,
      });

      const currentSha = branchRef.data.object.sha;

      // Get the current tree
      const treeResponse = await this.octokit.rest.git.getTree({
        owner: request.owner,
        repo: request.repository,
        tree_sha: currentSha,
        recursive: 'true',
      });

      // Create a blob for the file content
      const blobResponse = await this.octokit.rest.git.createBlob({
        owner: request.owner,
        repo: request.repository,
        content: Buffer.from(request.content).toString('base64'),
        encoding: 'base64',
      });

      // Create a tree with the new blob
      const treeResponse2 = await this.octokit.rest.git.createTree({
        owner: request.owner,
        repo: request.repository,
        base_tree: currentSha,
        tree: [
          {
            path: request.path,
            mode: '100644',
            type: 'blob',
            sha: blobResponse.data.sha,
          },
        ],
      });

      // Create a commit
      const commitResponse = await this.octokit.rest.git.createCommit({
        owner: request.owner,
        repo: request.repository,
        message: request.message,
        tree: treeResponse2.data.sha,
        parents: [currentSha],
      });

      // Update the branch reference
      await this.octokit.rest.git.updateRef({
        owner: request.owner,
        repo: request.repository,
        ref: `heads/${request.branch}`,
        sha: commitResponse.data.sha,
      });

      logger.info({
        event: 'github_file_commit_success',
        owner: request.owner,
        repository: request.repository,
        branch: request.branch,
        path: request.path,
        commitSha: commitResponse.data.sha,
      });
    } catch (error) {
      logger.error({
        event: 'github_file_commit_failed',
        owner: request.owner,
        repository: request.repository,
        branch: request.branch,
        path: request.path,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async checkPullRequestExists(
    request: CheckPullRequestRequest,
  ): Promise<PullRequestExistsResponse> {
    try {
      logger.info({
        event: 'github_pr_check_start',
        owner: request.owner,
        repository: request.repository,
        headBranch: request.headBranch,
        baseBranch: request.baseBranch,
      });

      const response = await this.octokit.rest.pulls.list({
        owner: request.owner,
        repo: request.repository,
        head: `${request.owner}:${request.headBranch}`,
        base: request.baseBranch,
        state: 'open',
      });

      if (response.data.length > 0) {
        const pr = response.data[0];
        if (!pr) {
          return { exists: false };
        }
        logger.info({
          event: 'github_pr_exists',
          owner: request.owner,
          repository: request.repository,
          headBranch: request.headBranch,
          baseBranch: request.baseBranch,
          prNumber: pr.number,
          prUrl: pr.html_url,
        });
        return {
          exists: true,
          number: pr.number,
          url: pr.html_url,
        };
      }

      logger.info({
        event: 'github_pr_not_exists',
        owner: request.owner,
        repository: request.repository,
        headBranch: request.headBranch,
        baseBranch: request.baseBranch,
      });
      return { exists: false };
    } catch (error) {
      logger.error({
        event: 'github_pr_check_failed',
        owner: request.owner,
        repository: request.repository,
        headBranch: request.headBranch,
        baseBranch: request.baseBranch,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
