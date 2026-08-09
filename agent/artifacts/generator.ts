import { ExecutionPlan } from '../planner/types.js';
import { RiskAssessment } from '../risk/types.js';

import { MigrationArtifacts } from './types.js';
import { ArtifactValidator } from './validator.js';
import { SqlGenerator } from './sql-generator.js';
import { SummaryGenerator } from './summary-generator.js';

export class ArtifactGenerator {
  constructor(
    private readonly sqlGenerator = new SqlGenerator(),
    private readonly summaryGenerator = new SummaryGenerator(),
  ) {}

  private readonly validator = new ArtifactValidator();

  generate(plan: ExecutionPlan, risk: RiskAssessment): MigrationArtifacts {
    const sql = this.sqlGenerator.generate(plan);
    const summary = this.summaryGenerator.generate(plan, risk);

    const artifacts: MigrationArtifacts = {
      summary: summary,
      sql: sql.migration,
      rollback: sql.rollback,
      pullRequest: summary,
      checklist: [],
    };

    this.validator.validate(artifacts);

    return artifacts;
  }
}
