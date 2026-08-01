import { GitHubEngine } from "../../github/github-engine.js";

import { PipelineStage } from "../pipeline.js";
import { StateStore } from "../state.js";
import { MissingWorkflowStateError } from "../errors.js";
import { logger } from "../../config/logger.js";
import { PerformanceTracker } from "../../utils/performance.js";

export class GitHubStage implements PipelineStage {

  readonly name = "github";

  constructor(
    private readonly engine: GitHubEngine,
    private readonly owner: string,
    private readonly repository: string,
    private readonly baseBranch: string
  ) {}

  async execute(
    state: StateStore,
    perf?: PerformanceTracker
  ): Promise<void> {

    logger.info({
      event: "github_started",
      owner: this.owner,
      repository: this.repository,
      baseBranch: this.baseBranch,
    }, "GitHub PR Creation Started");

    const approval = state.get("approval");
    const context = state.get("context");
    const plan = state.get("plan");
    const generation = state.get("generation");
    const impact = state.get("impact");

    if (!approval) {
      throw new MissingWorkflowStateError("approval");
    }

    if (!context) {
      throw new MissingWorkflowStateError("context");
    }

    if (!plan) {
      throw new MissingWorkflowStateError("plan");
    }

    if (!generation) {
      throw new MissingWorkflowStateError("generation");
    }

    if (!impact) {
      throw new MissingWorkflowStateError("impact");
    }

    if (approval.status !== "APPROVED") {
      logger.info({
        event: "github_skipped",
        reason: "Not approved",
      }, "GitHub PR Creation Skipped - Not Approved");
      return;
    }

    const result = await this.engine.execute({
      owner: this.owner,
      repository: this.repository,
      baseBranch: this.baseBranch,
      context,
      plan,
      generation,
      impact
    });

    state.set("github", result);

    logger.info({
      event: "github_complete",
      prNumber: result.number,
      prUrl: result.url,
      branch: result.branch,
    }, "GitHub PR Created Successfully");

  }

}