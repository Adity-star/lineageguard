import { ImpactReport } from '../impact/types.js';
import { logger } from '../config/logger.js';
import { PullRequestLabel } from './types.js';

export class LabelResolver {
  resolve(report: ImpactReport): PullRequestLabel[] {
    const labels: PullRequestLabel[] = [];

    // Base label
    labels.push({
      name: 'lineageguard',
      color: '0366d6',
    });

    // Risk level label
    labels.push({
      name: report.level.toLowerCase(),
      color: this.getColorForLevel(report.level),
    });

    // Manual review required
    if (report.requiresApproval) {
      labels.push({
        name: 'needs-review',
        color: 'fbca04',
      });
    }

    // High impact change
    if (report.score >= 80) {
      labels.push({
        name: 'high-impact',
        color: 'd73a4a',
      });
    }

    // Triggered governance rules
    if (report.triggeredRules) {
      for (const rule of report.triggeredRules) {
        labels.push({
          name: `impact:${rule.id}`,
          color: '6f42c1',
        });
      }
    }

    // Remove duplicates (by label name)
    const uniqueLabels = Array.from(
      new Map(labels.map((label) => [label.name, label])).values(),
    );

    logger.info(
      {
        event: 'github_labels_resolved',
        count: uniqueLabels.length,
        labels: uniqueLabels.map((l) => l.name),
      },
      'Resolved GitHub labels',
    );

    return uniqueLabels;
  }

  private getColorForLevel(level: string): string {
    switch (level.toUpperCase()) {
      case 'LOW':
        return '0e8a16'; // Green
      case 'MEDIUM':
        return 'fbca04'; // Yellow
      case 'HIGH':
        return 'd73a4a'; // Red
      case 'CRITICAL':
        return 'b60205'; // Dark Red
      default:
        return 'cccccc'; // Gray
    }
  }
}
