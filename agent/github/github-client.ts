export interface CreatePullRequestRequest {

  owner: string;

  repository: string;

  baseBranch: string;

  headBranch: string;

  title: string;

  body: string;

  labels: string[];

  reviewers: string[];

}

export interface PullRequestResponse {

  number: number;

  url: string;

}

export interface GitHubClient {

  createPullRequest(
    request: CreatePullRequestRequest
  ): Promise<PullRequestResponse>;

  addLabels(
    prNumber: number,
    labels: string[]
  ): Promise<void>;

  requestReviewers(
    prNumber: number,
    reviewers: string[]
  ): Promise<void>;

}