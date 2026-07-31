import { BranchBuilder } from "./branch";
import { CommitBuilder } from "./commit";
import { PullRequestTemplate } from "./templates";
import { ReviewerResolver } from "./reviewers";
import { LabelResolver } from "./labels";

import { ExecutionPlan } from "@/planning";
import { GenerationResult } from "@/generator";
import { ImpactReport } from "@/impact";
import { ContextBundle } from "@/context";

import { PullRequest } from "./types";

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

  ): PullRequest {

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