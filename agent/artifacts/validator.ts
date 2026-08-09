import { ZodError } from 'zod';

import { MigrationArtifacts, MigrationArtifactsSchema } from './types.js';

export class ArtifactValidationError extends Error {
  constructor(
    message: string,
    public readonly issues?: ZodError['issues'],
  ) {
    super(message);

    this.name = 'ArtifactValidationError';
  }
}

export class ArtifactValidator {
  validate(data: unknown): MigrationArtifacts {
    const result = MigrationArtifactsSchema.safeParse(data);

    if (!result.success) {
      throw new ArtifactValidationError(
        'Generated artifacts are invalid.',
        result.error.issues,
      );
    }

    return result.data;
  }
}
