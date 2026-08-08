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

export interface CreateBranchRequest {
  owner: string;
  repository: string;
  baseBranch: string;
  newBranch: string;
}

export interface GetBranchRequest {
  owner: string;
  repository: string;
  branch: string;
}

export interface GetBranchResponse {
  exists: boolean;
  sha?: string;
}

export interface CommitFileRequest {
  owner: string;
  repository: string;
  branch: string;
  path: string;
  content: string;
  message: string;
}

export interface CheckPullRequestRequest {
  owner: string;
  repository: string;
  headBranch: string;
  baseBranch: string;
}

export interface PullRequestExistsResponse {
  exists: boolean;
  number?: number;
  url?: string;
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

  createBranch(
    request: CreateBranchRequest
  ): Promise<void>;

  getBranch(
    request: GetBranchRequest
  ): Promise<GetBranchResponse>;

  commitFile(
    request: CommitFileRequest
  ): Promise<void>;

  checkPullRequestExists(
    request: CheckPullRequestRequest
  ): Promise<PullRequestExistsResponse>;
}