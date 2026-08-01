import { ImpactReport } from "../impact/types.js";
import { logger } from "../config/logger.js";

export class LabelResolver {

  resolve(
    report: ImpactReport
  ): string[] {

    const labels: string[] = [];

    labels.push("lineageguard");

    labels.push(report.level.toLowerCase());

    if (report.requiresApproval) {
      labels.push("needs-review");
    }

    if (report.score >= 80) {
      labels.push("high-impact");
    }

    if (report.triggeredRules) {
      for (const rule of report.triggeredRules) {
        labels.push(`impact:${rule.id}`);
      }
    }

    return [...new Set(labels)];

  }

  private getColorForLevel(level: string): string {
    switch (level.toUpperCase()) {
      case "LOW":
        return "00cc00";
      case "MEDIUM":
        return "ffcc00";
      case "HIGH":
        return "ff6600";
      case "CRITICAL":
        return "ff0000";
      default:
        return "cccccc";
    }
  }

}