import { ZodError } from "zod";

import {
  ExecutionPlan,
  ExecutionPlanSchema,
} from "./types";

export class PlanningValidationError extends Error {
  constructor(
    message: string,
    public readonly issues?: ZodError["issues"]
  ) {
    super(message);
    this.name = "PlanningValidationError";
  }
}

export class PlanningValidator {
  validate(data: unknown): ExecutionPlan {
    const result = ExecutionPlanSchema.safeParse(data);

    if (!result.success) {
      throw new PlanningValidationError(
        "Execution plan validation failed.",
        result.error.issues
      );
    }

    return result.data;
  }

  isValid(data: unknown): boolean {
    return ExecutionPlanSchema.safeParse(data).success;
  }
}