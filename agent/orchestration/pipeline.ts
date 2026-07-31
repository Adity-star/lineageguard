import { StateStore } from "./state";

/**
 * A single executable workflow stage.
 */
export interface PipelineStage {

  /**
   * Human-readable stage name.
   */
  readonly name: string;

  /**
   * Execute this stage.
   */
  execute(
    state: StateStore
  ): Promise<void>;

}

/**
 * Executes stages sequentially.
 */
export class Pipeline {

  constructor(
    private readonly stages: PipelineStage[]
  ) {}

  async execute(
    state: StateStore
  ): Promise<void> {

    for (const stage of this.stages) {

      await stage.execute(state);

    }

  }

}