export class WorkflowError extends Error {
  constructor(
    message: string,

    public readonly stage: string,

    public readonly cause?: unknown,
  ) {
    super(message);

    this.name = 'WorkflowError';
  }
}

export class MissingWorkflowStateError extends WorkflowError {
  constructor(property: string) {
    super(
      `Workflow state is missing "${property}".`,

      'state',
    );

    this.name = 'MissingWorkflowStateError';
  }
}
