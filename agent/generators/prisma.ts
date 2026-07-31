import { ExecutionPlan } from "../planner/types.js";

import { PrismaArtifact } from "./types.js";
import { LLMEditor } from "./llm-editor.js";
import { PrismaRunner } from "./prisma-runner.js";

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

    const validation = await this.runner.validate(
      edited.updatedSchema
    );

    if (!validation.valid) {
      throw new Error(
        validation.errors.join("\n")
      );
    }

    return {
      schema: edited.updatedSchema,
      valid: true,
    };
  }
}