import { ExecutionPlan } from "../planner/types.js";
import { RiskAssessment } from "../risk/types.js";

import { PrismaGenerator } from "./prisma.js";
import { SQLGenerator } from "./sql.js";
import { RollbackGenerator } from "./rollback.js";
import { DocumentationGenerator } from "./documentation.js";
import { DbtGenerator } from "./db.js";
import { GenerationValidator } from "./validator.js";
import { GenerationResult } from "./types.js";

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
    const migration = prismaResult.migration || "-- No migration generated";
    const sql =
      this.sql.generate(migration);

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