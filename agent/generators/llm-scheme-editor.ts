import { MessageRequest } from "../llm/grok.js";
import { logger } from "../config/logger.js";
import { LLMEditor, SchemaEditorRequest, SchemaEditorResponse } from "./llm-editor.js";
import { sanitizePrompt } from "../utils/security.js";
import { LLMClient } from "../planner/planner.js";

/**
 * Provider-agnostic schema editor.
 * Works with Grok, Anthropic, OpenAI, Gemini, etc.
 */
export class LLMSchemaEditor implements LLMEditor {
  constructor(
    private readonly client: LLMClient
  ) {}

  async editSchema(
    request: SchemaEditorRequest
  ): Promise<SchemaEditorResponse> {
    const systemPrompt = `You are an expert Prisma schema editor.

Your task is to modify a Prisma schema according to the requested changes.

Rules:
- Return ONLY the updated Prisma schema
- Do not include markdown code blocks
- Do not include explanations
- Preserve all existing models and fields unless explicitly changed
- Ensure the schema is valid Prisma syntax
- Keep comments where possible`;

    const userPrompt = sanitizePrompt(`
Current Prisma Schema:

\`\`\`prisma
${request.schema}
\`\`\`

Requested Changes:

${JSON.stringify(request.plan, null, 2)}

Please modify the schema to implement these changes.
`);

    try {
      logger.info({
        event: "schema_edit_start",
        schemaLength: request.schema.length,
      });

      const updatedSchema = await this.client.generate(
        systemPrompt,
        userPrompt
      );

      const cleanedSchema = this.extractSchema(updatedSchema);

      logger.info({
        event: "schema_edit_success",
        originalLength: request.schema.length,
        updatedLength: cleanedSchema.length,
      });

      return {
        updatedSchema: cleanedSchema,
      };
    } catch (error) {
      logger.error({
        event: "schema_edit_failed",
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  private extractSchema(content: string): string {
    let cleaned = content.trim();

    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```(?:prisma)?/i, "")
        .replace(/```$/, "")
        .trim();
    }

    return cleaned;
  }
}