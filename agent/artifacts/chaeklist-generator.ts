import { ExecutionPlan } from "@/planning";
import { RiskAssessment } from "@/risk";

import { ChecklistItem } from "./types";

export class ChecklistGenerator {
  generate(
    plan: ExecutionPlan,
    risk: RiskAssessment
  ): ChecklistItem[] {
    const checklist: ChecklistItem[] = [];

    checklist.push({
      title: "Review generated migration",
      completed: false,
    });

    checklist.push({
      title: "Validate impacted datasets",
      completed: false,
    });

    if (risk.requiresApproval) {
      checklist.push({
        title: "Obtain required approval",
        completed: false,
      });
    }

    if (risk.score >= 50) {
      checklist.push({
        title: "Test in staging environment",
        completed: false,
      });

      checklist.push({
        title: "Verify downstream consumers",
        completed: false,
      });
    }

    if (plan.missingInformation.length > 0) {
      checklist.push({
        title: "Resolve missing information",
        completed: false,
      });
    }

    checklist.push({
      title: "Prepare rollback plan",
      completed: false,
    });

    checklist.push({
      title: "Monitor deployment",
      completed: false,
    });

    return checklist;
  }
}