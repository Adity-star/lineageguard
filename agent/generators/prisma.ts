import { ExecutionPlan } from "@/planning";

import { PrismaArtifact } from "./types";
import { LLMEditor } from "./llm-editor";
import { PrismaRunner } from "./prisma-runner";

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