import { ExecutionPlan } from "@/planning";
import { RiskAssessment } from "@/risk";

import { MigrationArtifacts } from "./types";
import { ArtifactValidator } from "./validator";
import { SqlGenerator } from "./sql-generator";
import { SummaryGenerator } from "./summary-generator";
import { ChecklistGenerator } from "./checklist-generator";

export class ArtifactGenerator {
  constructor(
    private readonly sqlGenerator =
      new SqlGenerator(),

    private readonly summaryGenerator =
      new SummaryGenerator(),

    private readonly checklistGenerator =
      new ChecklistGenerator(),

    private readonly validator =
      new ArtifactValidator()
  ) {}

  generate(
    plan: ExecutionPlan,
    risk: RiskAssessment
  ): MigrationArtifacts {

    const sql =
      this.sqlGenerator.generate(plan);

    const summary =
      this.summaryGenerator.generate(
        plan,
        risk
      );

    const checklist =
      this.checklistGenerator.generate(
        plan,
        risk
      );

    const pullRequest = [
      "# Summary",
      "",
      summary,
      "",
      "# Risk",
      `Risk Level: ${risk.overallRisk}`,
      `Risk Score: ${risk.score}/100`,
      "",
      "# Recommendations",
      ...risk.recommendations.map(r => `- ${r}`)
    ].join("\n");

    const artifacts: MigrationArtifacts = {

      summary,

      migration: sql.migration,

      rollback: sql.rollback,

      pullRequest,

      checklist

    };

    return this.validator.validate(
      artifacts
    );
  }
}