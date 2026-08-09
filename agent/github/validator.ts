import { ZodError } from 'zod';

import { PullRequest, PullRequestSchema } from './types.js';

export class GitHubValidationError extends Error {
  constructor(
    message: string,
    public readonly issues?: ZodError['issues'],
  ) {
    super(message);

    this.name = 'GitHubValidationError';
  }
}

export class GitHubValidator {
  validate(data: unknown): PullRequest {
    const result = PullRequestSchema.safeParse(data);

    if (!result.success) {
      throw new GitHubValidationError(
        'Invalid Pull Request.',

        result.error.issues,
      );
    }

    return result.data;
  }
}
