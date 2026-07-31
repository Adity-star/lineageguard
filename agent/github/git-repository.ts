import { Octokit } from "octokit";

export class GitHubRepository {

  constructor(
    private readonly octokit: Octokit,
    private readonly owner: string,
    private readonly repository: string
  ) {}

  async createBranch(
    baseBranch: string,
    newBranch: string
  ): Promise<void> {

    const base =
      await this.octokit.rest.git.getRef({

        owner: this.owner,

        repo: this.repository,

        ref: `heads/${baseBranch}`,

      });

    await this.octokit.rest.git.createRef({

      owner: this.owner,

      repo: this.repository,

      ref: `refs/heads/${newBranch}`,

      sha: base.data.object.sha,

    });

  }

}