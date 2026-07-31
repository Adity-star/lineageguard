import { WorkflowState } from "./type.js";

export class StateStore {

  constructor(
    private readonly state: WorkflowState
  ) {}

  get value(): WorkflowState {
    return this.state;
  }

  update(
    updates: Partial<WorkflowState>
  ): void {

    Object.assign(
      this.state,
      updates
    );

  }

  get<K extends keyof WorkflowState>(
    key: K
  ): WorkflowState[K] {

    return this.state[key];

  }

  set<K extends keyof WorkflowState>(
    key: K,
    value: WorkflowState[K]
  ): void {

    this.state[key] = value;

  }

}