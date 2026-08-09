import { PlanningEngine } from '../../planner/planning-engine.js';

import { PipelineStage } from '../pipeline.js';
import { StateStore } from '../state.js';
import { MissingWorkflowStateError } from '../errors.js';
import { logger } from '../../config/logger.js';
import { PerformanceTracker } from '../../utils/performance.js';
import {
  IdempotencyService,
  withIdempotency,
  OperationType,
} from '../../utils/idempotency.js';

export class PlanningStage implements PipelineStage {
  readonly name = 'planning';

  constructor(
    private readonly engine: PlanningEngine,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async execute(state: StateStore, perf?: PerformanceTracker): Promise<void> {
    const request = state.get('request');
    const context = state.get('context');

    if (!request) {
      throw new MissingWorkflowStateError('request');
    }

    if (!context) {
      throw new MissingWorkflowStateError('context');
    }

    const idempotencyKey = IdempotencyService.generateKey({
      description: request.description,
      datasetUrn: request.datasetUrn || 'none',
      contextHash: context.dataset?.urn || 'none',
    });

    const plan = await withIdempotency(
      {
        key: idempotencyKey,
        operationType: OperationType.PLANNING,
      },
      async () => {
        return await this.engine.plan(request, context);
      },
      this.idempotencyService,
    );

    state.set('plan', plan.plan);

    logger.info(
      {
        event: 'planning_complete',
        confidence: plan.plan?.confidence,
        requiresApproval: plan.plan?.requiresApproval,
        affectedColumns: plan.plan?.affectedColumns?.length || 0,
      },
      'Planning Complete',
    );
  }
}
