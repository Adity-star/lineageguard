import { ZodError } from 'zod';

import { RiskAssessment, RiskAssessmentSchema } from './types.js';

export class RiskValidationError extends Error {
  constructor(
    message: string,
    public readonly issues?: ZodError['issues'],
  ) {
    super(message);

    this.name = 'RiskValidationError';
  }
}

export class RiskValidator {
  validate(data: unknown): RiskAssessment {
    const result = RiskAssessmentSchema.safeParse(data);

    if (!result.success) {
      throw new RiskValidationError(
        'Risk assessment validation failed.',
        result.error.issues,
      );
    }

    return result.data;
  }

  isValid(data: unknown): boolean {
    return RiskAssessmentSchema.safeParse(data).success;
  }
}
