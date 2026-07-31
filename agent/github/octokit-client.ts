import { Octokit } from "octokit";

import {
  CreatePullRequestRequest,
  GitHubClient,
  PullRequestResponse,
} from "./github-client";

export class OctokitGitHubClient implements GitHubClient {

  private readonly octokit: Octokit;

  private owner: string | undefined;
  private repository: string | undefined;

  constructor(
    token: string,
    owner?: string,
    repository?: string
  ) {

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
    request: CreatePullRequestRequest
  ): Promise<PullRequestResponse> {

    const response =
      await this.octokit.rest.pulls.create({

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

  async addLabels(
    prNumber: number,
    labels: string[]
  ): Promise<void> {

    if (labels.length === 0) {
      return;
    }

    if (!this.owner || !this.repository) {
      throw new Error(
        "Owner/repository context required. Call setContext() or provide in constructor."
      );
    }

    await this.octokit.rest.issues.addLabels({
      owner: this.owner,
      repo: this.repository,
      issue_number: prNumber,
      labels,
    });

  }

  async requestReviewers(
    prNumber: number,
    reviewers: string[]
  ): Promise<void> {

    if (reviewers.length === 0) {
      return;
    }

    if (!this.owner || !this.repository) {
      throw new Error(
        "Owner/repository context required. Call setContext() or provide in constructor."
      );
    }

    await this.octokit.rest.pulls.requestReviewers({
      owner: this.owner,
      repo: this.repository,
      pull_number: prNumber,
      reviewers,
    });

  }

}