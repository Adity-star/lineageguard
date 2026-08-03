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

You are editing an EXISTING Prisma schema.

CRITICAL REQUIREMENTS:
1. Return ONLY the Prisma schema - nothing else.
2. Return the COMPLETE schema.prisma file.
3. Never return markdown code fences (\`\`\`).
4. Never return explanatory text before or after the schema.
5. Never return "Please replace..." or similar instructions.
6. Never use markdown formatting of any kind.
7. Preserve EVERYTHING in the schema unless explicitly changed.
8. Preserve the datasource block.
9. Preserve the generator block.
10. Preserve every model, enum, and view.
11. Preserve comments whenever possible.
12. Do not remove unrelated models.
13. Return valid Prisma syntax only.
14. Output format: pure Prisma schema text only.`;

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
        event: "schema_preview",
        preview: cleanedSchema.substring(0, 1000),
    });

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

    // Remove markdown code fences (```prisma ... ```)
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```(?:prisma)?\s*\n?/i, "")  // Remove opening fence with optional language specifier
        .replace(/\n?```\s*$/i, "")               // Remove closing fence
        .trim();
    }

    // Remove any remaining markdown-style text patterns
    // Remove lines that look like markdown comments (starting with #, ##, etc.)
    cleaned = cleaned
      .split('\n')
      .filter(line => !line.match(/^#+\s+/))  // Remove markdown headers
      .join('\n')
      .trim();

    // Remove explanatory text patterns like "Please replace..." or "You can now..."
    // These are common LLM artifacts
    const lines = cleaned.split('\n');
    let inPrismaBlock = false;
    const prismaLines: string[] = [];

    for (const line of lines) {
      // Check if line looks like Prisma syntax or a comment
      if (
        line.match(/^\s*(datasource|generator|model|enum|view|type|\/\/)/i) ||
        line.match(/^\s*[{}]/) ||
        line.match(/^\s*@/) ||
        line.match(/^\s*$/)  // Empty lines are ok
      ) {
        inPrismaBlock = true;
        prismaLines.push(line);
      } else if (inPrismaBlock && (line.trim().length === 0 || line.match(/^\s*}/))) {
        // Allow trailing content if we're in a Prisma block
        prismaLines.push(line);
      } else if (!line.match(/please|you can|note|warning|replace|update|modify|apply/i)) {
        // Keep lines that don't look like explanatory text
        if (inPrismaBlock) {
          prismaLines.push(line);
        }
      }
    }

    cleaned = prismaLines.join('\n').trim();

    // Final validation: ensure we have at least one Prisma keyword
    if (!cleaned.match(/(datasource|generator|model|enum)/i)) {
      logger.warn({
        event: "schema_extraction_suspicious_output",
        hasContent: cleaned.length > 0,
        contentPreview: cleaned.substring(0, 200),
      }, "Extracted schema contains no recognizable Prisma keywords - may indicate extraction failure");
    }

    return cleaned;
  }
}