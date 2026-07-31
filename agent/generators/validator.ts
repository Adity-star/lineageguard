import { ZodError } from "zod";

import {
  GenerationResult,
  GenerationResultSchema,
} from "./types";

export class GenerationValidationError extends Error {
  constructor(
    message: string,
    public readonly issues?: ZodError["issues"]
  ) {
    super(message);

    this.name =
      "GenerationValidationError";
  }
}

export class GenerationValidator {
  validate(
    data: unknown
  ): GenerationResult {

    const result =
      GenerationResultSchema.safeParse(
        data
      );

    if (!result.success) {
      throw new GenerationValidationError(
        "Generated artifacts are invalid.",
        result.error.issues
      );
    }

    return result.data;
  }
}