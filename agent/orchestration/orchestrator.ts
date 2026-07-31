import { ChangeRequest } from "../mcp/types.js";

import {
  Pipeline,
  PipelineStage,
} from "./pipeline.js";

import { StateStore } from "./state.js";

import { WorkflowState } from "./type.js";

import {
  WorkflowError,
} from "./errors.js";

import {
  WorkflowEvent,
  WorkflowListener,
} from "./events.js";

export class Orchestrator {

  private readonly pipeline: Pipeline;

  constructor(
    stages: PipelineStage[],
    private readonly owner: string,
    private readonly repository: string,
    private readonly baseBranch: string,
    private readonly listener?: WorkflowListener
  ) {

    this.pipeline = new Pipeline(stages);

  }

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