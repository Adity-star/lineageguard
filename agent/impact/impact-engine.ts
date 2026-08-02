import { ContextBundle } from "../context/type.js";
import { ExecutionPlan } from "../planner/types.js";
import { RiskAssessment } from "../risk/types.js";

import { ReportBuilder } from "./report.js";
import { ImpactScorer } from "./scorer.js";
import { RecommendationEngine } from "./recommendations.js";
import { MetadataWriter } from "./metadata-writer.js";
import { ImpactReport } from "./types.js";
import { ImpactValidator } from "./validator.js";

export class ImpactEngine {

  constructor(
    private readonly writer: MetadataWriter,
    private readonly scorer = new ImpactScorer(),
    private readonly recommendations = new RecommendationEngine(),
    private readonly reportBuilder = new ReportBuilder(),
    private readonly validator = new ImpactValidator()
  ) {}

  async execute(

    context: ContextBundle,

    plan: ExecutionPlan,

    risk: RiskAssessment

  ): Promise<ImpactReport> {

    // Step 1 - Calculate impact
    const impact =
      this.scorer.score(
        context,
        plan,
        risk
      );

    // Step 2 - Generate recommendations
    const recommendations =
      this.recommendations.generate(
        context,
        plan,
        risk,
        impact.level
      );

    // Step 3 - Build report
    const report =
      this.reportBuilder.build(
        context,
        plan,
        risk,
        impact,
        recommendations
      );

    // Step 4 - Validate report
    const validated =
      this.validator.validate(report);

    // Step 5 - Persist to DataHub
    await this.writer.write(validated, context);

    return validated;
  }

}