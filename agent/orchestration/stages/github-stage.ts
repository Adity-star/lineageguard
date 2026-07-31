import { GitHubEngine } from "@/github";

import { PipelineStage } from "../pipeline";
import { StateStore } from "../state";
import { MissingWorkflowStateError } from "../errors";

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

    const context = state.get("context");
    const plan = state.get("plan");
    const generation = state.get("generation");
    const impact = state.get("impact");

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

      plan,

      generation,

      impact

    });

    state.set(
      "github",
      github
    );

  }

}