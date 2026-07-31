import { ContextBundle } from "@/context";
import { ExecutionPlan } from "@/planning";
import { RiskAssessment } from "@/risk";

import { ImpactReport } from "./types";
import { ImpactValidator } from "./validator";
import { ImpactScorer } from "./scorer";
import { RecommendationEngine } from "./recommendations";
import { ReportBuilder } from "./report";
import { MetadataWriter } from "./metadata-writer";

export class ImpactEngine {

  constructor(

    private readonly scorer = new ImpactScorer(),

    private readonly recommendations =
      new RecommendationEngine(),

    private readonly reportBuilder =
      new ReportBuilder(),

    private readonly validator =
      new ImpactValidator(),

    private readonly writer: MetadataWriter

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
    await this.writer.write(validated);

    return validated;
  }

}