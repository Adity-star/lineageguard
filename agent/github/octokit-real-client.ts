import { Octokit } from "@octokit/rest";
import { logger } from "../config/logger.js";
import { GitHubClient, PullRequestRequest, PullRequestResponse } from "./github-client.js";

/**
 * Real GitHub client implementation using Octokit
 */
export class OctokitRealClient implements GitHubClient {
  private readonly octokit: Octokit;

  constructor(
    private readonly token: string,
    private readonly owner: string,
    private readonly repository: string
  ) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  async createPullRequest(
    request: PullRequestRequest
  ): Promise<PullRequestResponse> {
    try {
      logger.info({
        event: "github_pr_create_start",
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
        event: "github_pr_create_success",
        prNumber: result.number,
        prUrl: result.url,
      });

      return result;
    } catch (error) {
      logger.error({
        event: "github_pr_create_failed",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async addLabels(prNumber: number, labels: string[]): Promise<void> {
    try {
      logger.info({
        event: "github_labels_add_start",
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
        event: "github_labels_add_success",
        prNumber,
        labels,
      });
    } catch (error) {
      logger.error({
        event: "github_labels_add_failed",
        prNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async requestReviewers(
    prNumber: number,
    reviewers: string[]
  ): Promise<void> {
    try {
      logger.info({
        event: "github_reviewers_request_start",
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
        event: "github_reviewers_request_success",
        prNumber,
        reviewers,
      });
    } catch (error) {
      logger.error({
        event: "github_reviewers_request_failed",
        prNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
