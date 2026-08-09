import { ExecutionPlan } from '../planner/types.js';
import { logger } from '../config/logger.js';

export class CommitBuilder {
  build(plan: any): string {
    const executionPlan = plan.plan || plan;
    const intent =
      executionPlan.intent || executionPlan.summary || 'schema change';
    const affectedDataset =
      executionPlan.affectedDataset ||
      executionPlan.summary?.split(' ').pop() ||
      'dataset';

    switch (intent) {
      case 'rename_column':
        return `Rename column in ${affectedDataset}`;

      case 'drop_column':
        return `Drop column from ${affectedDataset}`;

      case 'add_column':
        return `Add column to ${affectedDataset}`;

      case 'drop_table':
        return `Drop table ${affectedDataset}`;

      default:
        return `Update schema for ${affectedDataset}`;
    }
  }
}
