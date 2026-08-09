export enum WorkflowEvent {
  STARTED = 'workflow.started',

  CONTEXT_COLLECTED = 'workflow.context',

  PLAN_CREATED = 'workflow.plan',

  RISK_CALCULATED = 'workflow.risk',

  ARTIFACTS_GENERATED = 'workflow.generator',

  IMPACT_WRITTEN = 'workflow.impact',

  COMPLETED = 'workflow.completed',

  FAILED = 'workflow.failed',
}

export interface WorkflowListener {
  (event: WorkflowEvent, payload?: unknown): Promise<void> | void;
}
