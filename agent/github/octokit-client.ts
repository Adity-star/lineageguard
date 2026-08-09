import { Octokit } from 'octokit';

import {
  CreatePullRequestRequest,
  GitHubClient,
  PullRequestResponse,
  CreateBranchRequest,
  GetBranchRequest,
  GetBranchResponse,
  CommitFileRequest,
  CheckPullRequestRequest,
  PullRequestExistsResponse,
} from './github-client.js';

export class OctokitGitHubClient implements GitHubClient {
  private readonly octokit: Octokit;

  private owner: string | undefined;
  private repository: string | undefined;

  constructor(token: string, owner?: string, repository?: string) {
    this.octokit = new Octokit({
      auth: token,
    });

    this.owner = owner;
    this.repository = repository;
  }

  setContext(owner: string, repository: string) {
    this.owner = owner;
    this.repository = repository;
  }

  async createPullRequest(
    request: CreatePullRequestRequest,
  ): Promise<PullRequestResponse> {
    const response = await this.octokit.rest.pulls.create({
      owner: request.owner,

      repo: request.repository,

      base: request.baseBranch,

      head: request.headBranch,

      title: request.title,

      body: request.body,
    });

    return {
      number: response.data.number,

      url: response.data.html_url,
    };
  }

  async addLabels(prNumber: number, labels: string[]): Promise<void> {
    if (labels.length === 0) {
      return;
    }

    if (!this.owner || !this.repository) {
      throw new Error(
        'Owner/repository context required. Call setContext() or provide in constructor.',
      );
    }

    await this.octokit.rest.issues.addLabels({
      owner: this.owner,
      repo: this.repository,
      issue_number: prNumber,
      labels,
    });
  }

  async requestReviewers(prNumber: number, reviewers: string[]): Promise<void> {
    if (reviewers.length === 0) {
      return;
    }

    if (!this.owner || !this.repository) {
      throw new Error(
        'Owner/repository context required. Call setContext() or provide in constructor.',
      );
    }

    await this.octokit.rest.pulls.requestReviewers({
      owner: this.owner,
      repo: this.repository,
      pull_number: prNumber,
      reviewers,
    });
  }

  async createBranch(request: CreateBranchRequest): Promise<void> {
    if (!this.owner || !this.repository) {
      throw new Error(
        'Owner/repository context required. Call setContext() or provide in constructor.',
      );
    }

    // Get the base branch SHA
    const baseBranch = await this.octokit.rest.git.getRef({
      owner: request.owner,
      repo: request.repository,
      ref: `heads/${request.baseBranch}`,
    });

    // Create the new branch
    await this.octokit.rest.git.createRef({
      owner: request.owner,
      repo: request.repository,
      ref: `refs/heads/${request.newBranch}`,
      sha: baseBranch.data.object.sha,
    });
  }

  async getBranch(request: GetBranchRequest): Promise<GetBranchResponse> {
    if (!this.owner || !this.repository) {
      throw new Error(
        'Owner/repository context required. Call setContext() or provide in constructor.',
      );
    }

    try {
      const response = await this.octokit.rest.git.getRef({
        owner: request.owner,
        repo: request.repository,
        ref: `heads/${request.branch}`,
      });

      return {
        exists: true,
        sha: response.data.object.sha,
      };
    } catch (error) {
      return {
        exists: false,
      };
    }
  }

  async commitFile(request: CommitFileRequest): Promise<void> {
    if (!this.owner || !this.repository) {
      throw new Error(
        'Owner/repository context required. Call setContext() or provide in constructor.',
      );
    }

    // Get the current branch SHA
    const branchRef = await this.octokit.rest.git.getRef({
      owner: request.owner,
      repo: request.repository,
      ref: `heads/${request.branch}`,
    });

    const currentSha = branchRef.data.object.sha;

    // Create a blob for the file content
    const blobResponse = await this.octokit.rest.git.createBlob({
      owner: request.owner,
      repo: request.repository,
      content: Buffer.from(request.content).toString('base64'),
      encoding: 'base64',
    });

    // Create a tree with the new file
    const treeResponse = await this.octokit.rest.git.createTree({
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
      tree: treeResponse.data.sha,
      parents: [currentSha],
    });

    // Update the branch reference
    await this.octokit.rest.git.updateRef({
      owner: request.owner,
      repo: request.repository,
      ref: `heads/${request.branch}`,
      sha: commitResponse.data.sha,
    });
  }

  async checkPullRequestExists(request: CheckPullRequestRequest): Promise<PullRequestExistsResponse> {
    if (!this.owner || !this.repository) {
      throw new Error(
        'Owner/repository context required. Call setContext() or provide in constructor.',
      );
    }

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
      return {
        exists: true,
        number: pr.number,
        url: pr.html_url,
      };
    }

    return {
      exists: false,
    };
  }
}
