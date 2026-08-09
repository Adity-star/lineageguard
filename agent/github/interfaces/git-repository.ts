import { ChangedFile } from '../types/changed-file.js';

export interface GitRepository {
  createBranch(baseBranch: string, newBranch: string): Promise<void>;

  commitFiles(
    branch: string,
    message: string,
    files: ChangedFile[],
  ): Promise<void>;

  createPullRequest(
    owner: string,
    repository: string,
    base: string,
    head: string,
    title: string,
    body: string,
  ): Promise<number>;

  addLabels(pr: number, labels: string[]): Promise<void>;

  requestReviewers(pr: number, reviewers: string[]): Promise<void>;
}
