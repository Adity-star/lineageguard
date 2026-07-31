import { BranchBuilder } from "./branch.js";
import { CommitBuilder } from "./commit.js";
import { PullRequestTemplate } from "./templates.js";
import { ReviewerResolver } from "./reviewers.js";
import { LabelResolver } from "./labels.js";
import { ContextBundle } from "../context/type.js";
import { ExecutionPlan } from "../planner/types.js";
import { GenerationResult } from "../generators/types.js";
import { ImpactReport } from "../impact/types.js";
import { logger } from "../config/logger.js";

export class PullRequestBuilder {

  constructor(
    private readonly branchBuilder = new BranchBuilder(),
    private readonly commitBuilder = new CommitBuilder(),
    private readonly template = new PullRequestTemplate(),
    private readonly reviewers = new ReviewerResolver(),
    private readonly labels = new LabelResolver()
  ) {}

  build(
    context: ContextBundle,
    plan: ExecutionPlan,
    generation: GenerationResult,
    impact: ImpactReport
  ): {
    branch: string;
    title: string;
    body: string;
    labels: string[];
    reviewers: Array<{ username: string }>;
  } {

    return {

      branch:
        this.branchBuilder.build(plan),

      title:
        this.commitBuilder.build(plan),

      body:
        this.template.build(
          generation,
          impact
        ),

      labels:
        this.labels.resolve(
          impact
        ),

      reviewers:
        this.reviewers.resolve(
          context
        ).map(username => ({
          username
        }))

    };

  }

}