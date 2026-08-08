import { logger } from "../config/logger";
import { ExecutionPlan } from "./types";

export class PlanningParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanningParseError";
  }
}

export class PlanningParser {
  parse(response: string): ExecutionPlan {
    try {
      const cleaned = this.cleanResponse(response);
      logger.info(`RAW LLM RESPONSE: ${response}`);
      logger.info(`CLEANED RESPONSE: ${cleaned}`);
      const result = JSON.parse(cleaned) as ExecutionPlan;
      logger.info(`PARSED requiredchanges: ${JSON.stringify(result.requiredChanges)}`);
      logger.info(`PARSED affectedcolumns: ${JSON.stringify((result as any).affectedColumns)}`);
      return result;

    } catch (error) {
      throw new PlanningParseError(
        `Failed to parse planning response: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private cleanResponse(response: string): string {
    let cleaned = response.trim();

    // Remove ```json ... ```
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/, "")
        .trim();
    }

    // Remove anything before first {
    const firstBrace = cleaned.indexOf("{");
    if (firstBrace > 0) {
      cleaned = cleaned.substring(firstBrace);
    }

    // Remove anything after last }
    const lastBrace = cleaned.lastIndexOf("}");
    if (lastBrace !== -1) {
      cleaned = cleaned.substring(0, lastBrace + 1);
    }

    return cleaned;
  }
}