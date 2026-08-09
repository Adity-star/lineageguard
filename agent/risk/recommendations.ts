import { RiskMetrics } from './calculator.js';
import { RiskLevel } from './types.js';

export interface RiskRecommendation {
  title: string;
  description: string;
}

export class RecommendationEngine {
  generate(metrics: RiskMetrics, risk: RiskLevel): RiskRecommendation[] {
    const recommendations: RiskRecommendation[] = [];

    if (metrics.downstreamDatasets > 0) {
      recommendations.push({
        title: 'Review Downstream Dependencies',
        description: `Validate ${metrics.downstreamDatasets} downstream dataset(s) before deployment.`,
      });
    }

    if (!metrics.hasDocumentation) {
      recommendations.push({
        title: 'Add Documentation',
        description: 'Document the affected dataset before merging the change.',
      });
    }

    if (!metrics.hasOwner) {
      recommendations.push({
        title: 'Assign Dataset Owner',
        description:
          'Assign an owner to the dataset before approving this change.',
      });
    }

    if (metrics.queryCount > 20) {
      recommendations.push({
        title: 'Validate Query Compatibility',
        description:
          'Review frequently executed queries that reference this dataset.',
      });
    }

    if (risk === 'HIGH' || risk === 'CRITICAL') {
      recommendations.push({
        title: 'Perform Staged Rollout',
        description: 'Deploy using a phased rollout with rollback capability.',
      });
    }

    if (metrics.requiresApproval) {
      recommendations.push({
        title: 'Manual Approval Required',
        description: 'Obtain approval before executing this change.',
      });
    }

    return recommendations;
  }
}
