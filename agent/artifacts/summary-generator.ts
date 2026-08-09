import { ExecutionPlan } from '../planner/types.js';
import { RiskAssessment } from '../risk/types.js';

export class SummaryGenerator {
  generate(plan: ExecutionPlan, risk: RiskAssessment): string {
    return [
      `# Change Summary`,
      ``,
      plan.summary,
      ``,
      `## Intent`,
      plan.intent,
      ``,
      `## Risk`,
      `- Level: ${risk.overallRisk}`,
      `- Score: ${risk.score}/100`,
      ``,
      `## Affected Dataset`,
      `- ${plan.affectedDataset}`,
      ``,
      `## Affected Columns`,
      ...plan.affectedColumns.map((c) => `- ${c}`),
      ``,
      `## Assumptions`,
      ...(plan.assumptions.length
        ? plan.assumptions.map((a) => `- ${a}`)
        : ['- None']),
      ``,
      `## Missing Information`,
      ...(plan.missingInformation.length
        ? plan.missingInformation.map((i) => `- ${i}`)
        : ['- None']),
    ].join('\n');
  }
}
