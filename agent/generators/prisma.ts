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

    // Sanitize the schema to remove any remaining markdown artifacts
    const sanitizedSchema = this.sanitizeSchema(edited.updatedSchema);

    const validation = await this.runner.validate(
      sanitizedSchema
    );

    if (!validation.valid) {
      logger.error({ event: "generator_prisma_validation_failed", errors: validation.errors }, "Prisma validation failed");
      throw new Error(
        validation.errors.join("\n")
      );
    }

    logger.info({ event: "generator_prisma_validation_passed" }, "✓ Prisma Validation Passed");

    // Generate migration SQL from the schema changes
    let migration = "";
    try {
      const migrationResult = await this.runner.generateMigration(
        originalSchema,
        sanitizedSchema
      );
      migration = migrationResult.sql;
      logger.info({
        event: "generator_prisma_migration_generated",
        migrationLength: migration.length,
      }, "✓ Prisma Migration Generated");
    } catch (error) {
      logger.error({
        event: "generator_prisma_migration_failed",
        error: error instanceof Error ? error.message : String(error),
      }, "Failed to generate Prisma migration - continuing with empty migration");
      // Continue without migration rather than failing
      migration = "-- Migration generation failed\n";
    }

    return {
      schema: sanitizedSchema,
      valid: true,
      migration,
    };
  }

  private sanitizeSchema(schema: string): string {
    let cleaned = schema.trim();

    // Remove any remaining markdown code fences
    if (cleaned.includes("```")) {
      cleaned = cleaned
        .replace(/```(?:prisma)?/g, "")
        .trim();
    }

    // Remove lines that are clearly not Prisma syntax
    const lines = cleaned.split('\n');
    const prismaLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip completely empty lines unless they're needed for formatting
      if (trimmed.length === 0) {
        prismaLines.push('');
        continue;
      }

      // Skip lines that are pure explanatory text (not Prisma)
      if (
        trimmed.startsWith('//') ||                    // Comments are OK
        trimmed.startsWith('/*') ||                    // Block comments are OK
        trimmed.match(/^(datasource|generator|model|enum|view|type|@)/) ||  // Prisma keywords
        trimmed.match(/^[{}]$/) ||                     // Braces
        trimmed.match(/^\s*\w+\s*[\w\[\]?:|@]/i)      // Field definitions
      ) {
        prismaLines.push(line);
      } else if (!trimmed.match(/^(please|you can|note|warning|replace|update|modify|apply|the|this|since|your|our|we|our)/i)) {
        // Keep lines that don't look like pure English text
        prismaLines.push(line);
      }
    }

    return prismaLines.join('\n').trim();
  }
}