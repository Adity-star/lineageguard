import { ExecutionPlan } from '../planner/types.js';
import { ContextBundle } from '../context/type.js';
import { RiskAssessment } from '../risk/types.js';
import { logger } from '../config/logger.js';

import { PlatformAwareSQLGenerator } from './platform-aware-sql-generator.js';
import { SQLGenerator } from './sql.js';
import { RollbackGenerator } from './rollback.js';
import { DocumentationGenerator } from './documentation.js';
import { DbtGenerator } from './db.js';
import { GenerationValidator } from './validator.js';
import { GenerationResult } from './types.js';

/**
 * Code Generation Engine - orchestrates generation of platform-aware DDL,
 * SQL, rollback, and documentation artifacts.
 *
 * Replaces Prisma-based generation with platform-aware DDL targeting
 * the actual database platform from DataHub metadata.
 */
export class Generator {
  constructor(
    private readonly platformSQL = new PlatformAwareSQLGenerator(),
    private readonly sql = new SQLGenerator(),
    private readonly rollback = new RollbackGenerator(),
    private readonly documentation = new DocumentationGenerator(),
    private readonly dbt = new DbtGenerator(),
    private readonly validator = new GenerationValidator(),
  ) {}

  /**
   * Generate platform-aware artifacts from context and execution plan.
   *
   * @param context The ContextBundle containing schema and metadata
   * @param plan The execution plan with platform information
   * @param risk The risk assessment for documentation
   * @param runId The workflow run ID for documentation
   * @returns GenerationResult with DDL, SQL, rollback, and docs
   */
  async generate(
    context: ContextBundle,
    plan: ExecutionPlan,
    risk: RiskAssessment,
    runId?: string,
  ): Promise<GenerationResult> {
    logger.info(
      {
        event: 'generator_start',
        datasetName: context.dataset.name,
        platform: plan.platform || context.dataset.platform,
        fieldCount: context.schema.length,
      },
      `Generator starting for ${context.dataset.name}`,
    );

    // Step 1: Generate platform-aware DDL
    const ddl = await this.platformSQL.generate(context, plan);

    logger.info({ event: 'generator_ddl_generated' }, '✓ DDL Generated');

    // Step 2: Generate SQL artifact from DDL
    const sql = this.sql.generate(ddl.ddl, ddl.platform);

    logger.info({ event: 'generator_sql_generated' }, '✓ SQL Generated');

    // Step 3: Generate rollback statements
    const rollback = this.rollback.generate(plan);

    logger.info(
      { event: 'generator_rollback_generated' },
      '✓ Rollback Generated',
    );

    // Step 4: Generate documentation
    const documentation = this.documentation.generate(plan, risk, context, runId);

    logger.info(
      { event: 'generator_documentation_generated' },
      '✓ Documentation Generated',
    );

    // Step 5: Generate dbt artifacts (if applicable)
    const dbt = this.dbt.generate(plan);

    // Validate all artifacts
    return this.validator.validate({
      ddl,
      sql,
      rollback,
      documentation,
      dbt,
    });
  }
}
