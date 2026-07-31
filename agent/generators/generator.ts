import { ExecutionPlan } from "@/planning";
import { RiskAssessment } from "@/risk";

import { PrismaGenerator } from "./prisma";
import { SQLGenerator } from "./sql";
import { RollbackGenerator } from "./rollback";
import { DocumentationGenerator } from "./documentation";
import { DbtGenerator } from "./dbt";
import { GenerationValidator } from "./validator";
import { GenerationResult } from "./types";

export class Generator {

  constructor(

    private readonly prisma: PrismaGenerator,

    private readonly sql = new SQLGenerator(),

    private readonly rollback =
      new RollbackGenerator(),

    private readonly documentation =
      new DocumentationGenerator(),

    private readonly dbt =
      new DbtGenerator(),

    private readonly validator =
      new GenerationValidator()

  ) {}

  async generate(

    originalSchema: string,

    plan: ExecutionPlan,

    risk: RiskAssessment

  ): Promise<GenerationResult> {

    // Step 1
    const prismaResult =
      await this.prisma.generate(
        originalSchema,
        plan
      );

    // Step 2
    const sql =
      this.sql.generate(
        prismaResult.migration
      );

    // Step 3
    const rollback =
      this.rollback.generate(
        plan
      );

    // Step 4
    const documentation =
      this.documentation.generate(
        plan,
        risk
      );

    // Step 5
    const dbt =
      this.dbt.generate(
        plan
      );

    return this.validator.validate({

      prisma: prismaResult,

      sql,

      rollback,

      documentation,

      dbt

    });

  }

}