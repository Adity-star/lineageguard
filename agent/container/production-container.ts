import { config } from '../config/config.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { PrismaPg } from '@prisma/adapter-pg';

import { ContextEngine } from '../context/context-engine.js';
import { PlanningEngine } from '../planner/planning-engine.js';
import { RiskEngine } from '../risk/risk-engine.js';
import { Generator } from '../generators/generator.js';
import { ImpactEngine } from '../impact/impact-engine.js';
import { ApprovalEngine } from '../approval/approval-engine.js';
import { GitHubEngine } from '../github/github-engine.js';
import { Orchestrator } from '../orchestration/orchestrator.js';
import { StdioMCPTransport } from '../mcp/studio-transport.js';
import { MCPClient } from '../mcp/client.js';
import { DataHubClient } from '../mcp/datahub-client.js';
import { Planner } from '../planner/planner.js';
import { DataHubRealWriter } from '../impact/datahub-real-writer.js';
import { OctokitRealClient } from '../github/octokit-real-client.js';
import {
  ContextStage,
  PlanningStage,
  RiskStage,
  GeneratorStage,
  ImpactStage,
  ApprovalStage,
  GitHubStage,
} from '../orchestration/stages/index.js';
import { PrismaClient } from '@prisma/client';
import { IdempotencyService } from '../utils/idempotency.js';
import { GrokConfig, GrokClient } from '../llm/grok.js';
import { GrokLLMAdapter } from '../llm/grok-adapter.js';
/**
 * Production Container
 *
 * Uses real implementations for all external dependencies.
 * Never uses mock implementations in production mode.
 */

export class ProductionContainer {
  readonly context: ContextEngine;

  readonly planning: PlanningEngine;

  readonly risk: RiskEngine;

  readonly generator: Generator;

  readonly impact: ImpactEngine;

  readonly approval: ApprovalEngine;

  readonly github: GitHubEngine;

  readonly orchestrator: Orchestrator;

  private readonly mcpClient: MCPClient;

  constructor() {
    /**
     * Infrastructure - Real implementations only
     */

    // Use STDIO transport to launch mcp-server-datahub as a subprocess.
    // This avoids HTTP entirely and communicates over stdin/stdout.
    const mcpTransport = new StdioMCPTransport({
      command: 'mcp-server-datahub',
      timeoutMs: 30000,
      env: {
        DATAHUB_GMS_URL: env.DATAHUB_GMS_URL,
        DATAHUB_GMS_TOKEN: env.DATAHUB_GMS_TOKEN ?? '',
        // Enable mutation tools so the agent can write back to DataHub
        TOOLS_IS_MUTATION_ENABLED: env.TOOLS_IS_MUTATION_ENABLED,
      },
    });

    this.mcpClient = new MCPClient(mcpTransport);

    const datahubClient = new DataHubClient(
      this.mcpClient,
      env.DATAHUB_GMS_URL,
      env.DATAHUB_GMS_TOKEN,
    );

    // Idempotency
    const adapter = new PrismaPg({
      connectionString: env.DATABASE_URL,
    });

    const prismaClient = new PrismaClient({
      adapter,
    });
    const idempotencyService = new IdempotencyService(prismaClient);

    // Real Grok client
    const grokConfig: GrokConfig = {
      apiKey: config.grok.apiKey,
      model: config.grok.model,
      maxTokens: 4096,
      temperature: 0,
    };
    console.log('GROK DEBUG', {
      exists: !!grokConfig.apiKey,
      length: grokConfig.apiKey?.length,
      start: grokConfig.apiKey?.substring(0, 5),
      baseURL: grokConfig.baseURL,
    });

    const grokClient = new GrokClient(grokConfig);
    const llmAdapter = new GrokLLMAdapter(grokConfig);

    // Real GitHub client
    const githubClient = new OctokitRealClient(
      config.github.token,
      config.github.owner,
      config.github.repository,
    );

    /**
     * Generator - Now uses PlatformAwareSQLGenerator internally
     * Prisma is only for agent's internal persistence (Run, GeneratedArtifact, ImpactReport, Writeback)
     * No longer used for external entity migration generation
     */
    this.generator = new Generator();

    /**
     * Engines
     */

    const planner = new Planner(llmAdapter);

    const metadataWriter = new DataHubRealWriter(datahubClient);

    this.context = new ContextEngine(datahubClient);

    this.planning = new PlanningEngine(planner);

    this.risk = new RiskEngine();

    this.impact = new ImpactEngine(metadataWriter);

    this.approval = new ApprovalEngine();

    this.github = new GitHubEngine(githubClient);

    /**
     * Application
     */

    const contextStage = new ContextStage(this.context, idempotencyService);
    const planningStage = new PlanningStage(this.planning, idempotencyService);
    const riskStage = new RiskStage(this.risk, idempotencyService);
    const generatorStage = new GeneratorStage(
      this.generator,
      idempotencyService,
    );
    const impactStage = new ImpactStage(this.impact, idempotencyService);
    const approvalStage = new ApprovalStage(
      this.approval,
      idempotencyService,
      false,
    );
    const githubStage = new GitHubStage(
      this.github,
      config.github.owner,
      config.github.repository,
      config.github.baseBranch,
      idempotencyService,
    );

    this.orchestrator = new Orchestrator(
      [
        contextStage,
        planningStage,
        riskStage,
        generatorStage,
        impactStage,
        approvalStage,
        githubStage,
      ],
      config.github.owner,
      config.github.repository,
      config.github.baseBranch,
      idempotencyService,
    );

    logger.info(
      {
        event: 'production_container_initialized',
        grokModel: grokConfig.model,
        githubOwner: config.github.owner,
        githubRepository: config.github.repository,
        datahubUrl: config.datahub.url,
      },
      'Production container initialized with real implementations',
    );
  }

  getMcpClient(): MCPClient {
    return this.mcpClient;
  }
}

/**
 * Factory function to create the appropriate container based on environment
 */
export function createContainer() {
  const isProduction = env.NODE_ENV === 'production';
  const isDevelopment = env.NODE_ENV === 'development';

  if (isProduction) {
    logger.info('Creating PRODUCTION container with real implementations');
    return new ProductionContainer();
  }

  if (isDevelopment) {
    // In development, use production container by default
    // Can be overridden with USE_MOCKS=true
    const useMocks = process.env.USE_MOCKS === 'true';

    if (useMocks) {
      logger.info('Creating DEVELOPMENT container with MOCK implementations');
      // Import the development container with mocks
      const { ApplicationContainer } = require('./container.js');
      return new ApplicationContainer();
    }

    logger.info('Creating DEVELOPMENT container with REAL implementations');
    return new ProductionContainer();
  }

  // Default to production container for test
  logger.info('Creating PRODUCTION container (default)');
  return new ProductionContainer();
}
