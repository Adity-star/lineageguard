import { ZodError } from "zod";

import {
  ImpactReport,
  ImpactReportSchema,
} from "./types";

export class ImpactValidationError extends Error {
  constructor(
    message: string,
    public readonly issues?: ZodError["issues"]
  ) {
    super(message);

    this.name = "ImpactValidationError";
  }
}

export class ImpactValidator {
  validate(
    report: unknown
  ): ImpactReport {
    const result =
      ImpactReportSchema.safeParse(report);

    if (!result.success) {
      throw new ImpactValidationError(
        "Invalid impact report.",
        result.error.issues
      );
    }

    return result.data;
  }
}