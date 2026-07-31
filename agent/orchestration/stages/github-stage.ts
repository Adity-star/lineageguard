import { GitHubEngine } from "../../github/github-engine.js";

import { PipelineStage } from "../pipeline.js";
import { StateStore } from "../state.js";
import { MissingWorkflowStateError } from "../errors.js";

export class GitHubStage implements PipelineStage {

  readonly name = "github";

  constructor(
    private readonly engine: GitHubEngine,
    private readonly owner: string,
    private readonly repository: string,
    private readonly baseBranch = "main"
  ) {}

  async execute(
    state: StateStore
  ): Promise<void> {

    const approval = state.get("approval");
    const context = state.get("context");
    const plan = state.get("plan");
    const generation = state.get("generation");
    const impact = state.get("impact");

    if (!approval) {
      throw new MissingWorkflowStateError("approval");
    }

    // Check if approved before proceeding to GitHub
    if (approval.status !== "APPROVED") {
      // Skip GitHub stage if not approved
      return;
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

    const github = await this.engine.execute({

      owner: this.owner,

      repository: this.repository,

      baseBranch: this.baseBranch,

      context,

      plan: plan.plan,

      generation,

      impact

    });

    state.set(
      "github",
      github
    );

  }

}