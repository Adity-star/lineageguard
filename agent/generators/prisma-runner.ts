export interface PrismaValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PrismaMigrationResult {
  sql: string;
}

export interface PrismaRunner {
  validate(
    schema: string
  ): Promise<PrismaValidationResult>;

  generateMigration(
    originalSchema: string,
    updatedSchema: string
  ): Promise<PrismaMigrationResult>;
}