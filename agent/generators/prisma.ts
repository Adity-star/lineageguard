import { ExecutionPlan } from "../planner/types.js";

import { PrismaArtifact } from "./types.js";
import { LLMEditor } from "./llm-editor.js";
import { PrismaRunner } from "./prisma-runner.js";
import { logger } from "../config/logger.js";

export class PrismaGenerator {
  constructor(
    private readonly editor: LLMEditor,
    private readonly runner: PrismaRunner
  ) {}

  async generate(
    originalSchema: string,
    plan: ExecutionPlan
  ): Promise<PrismaArtifact> {
    const edited = await this.editor.editSchema({
      schema: originalSchema,
      plan,
    });

    logger.info({ event: "generator_prisma_updated" }, "✓ Prisma Updated");

    const validation = await this.runner.validate(
      edited.updatedSchema
    );

    if (!validation.valid) {
      logger.error({ event: "generator_prisma_validation_failed", errors: validation.errors }, "Prisma validation failed");
      throw new Error(
        validation.errors.join("\n")
      );
    }

    logger.info({ event: "generator_prisma_validation_passed" }, "✓ Prisma Validation Passed");

    return {
      schema: edited.updatedSchema,
      valid: true,
    };
  }
}