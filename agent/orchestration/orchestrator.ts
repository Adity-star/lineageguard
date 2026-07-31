import { ChangeRequest } from "@/mcp";

import {
  Pipeline,
  PipelineStage,
} from "./pipeline";

import { StateStore } from "./state";

import { WorkflowState } from "./types";

import {
  WorkflowError,
} from "./errors";

import {
  WorkflowEvent,
  WorkflowListener,
} from "./events";

import {
  ContextStage,
  PlanningStage,
  RiskStage,
  GeneratorStage,
  ImpactStage,
  GitHubStage,
} from "./stages";
import { config } from "zod/v4/core";

export class Orchestrator {

  private readonly pipeline: Pipeline;

  constructor(

    stages: PipelineStage[],

    private readonly listener?: WorkflowListener

  ) {

    this.pipeline = new Pipeline([
    new ContextStage(contextEngine),
    new PlanningStage(planningEngine),
    new RiskStage(riskEngine),
    new GeneratorStage(generatorEngine),
    new ImpactStage(impactEngine),
    new GitHubStage(
        githubEngine,
        config.github.owner,
        config.github.repository,
        config.github.baseBranch
    )
    ]);

  async execute(
    request: ChangeRequest
  ): Promise<WorkflowState> {

    const state =
      new StateStore({
        request,
      });

    try {

      await this.listener?.(
        WorkflowEvent.STARTED
      );

      await this.pipeline.execute(
        state
      );

      await this.listener?.(
        WorkflowEvent.COMPLETED,
        state.value
      );

      return state.value;

    } catch (error) {

      await this.listener?.(
        WorkflowEvent.FAILED,
        error
      );

      throw new WorkflowError(

        "Workflow execution failed.",

        "orchestrator",

        error

      );

    }

  }

}