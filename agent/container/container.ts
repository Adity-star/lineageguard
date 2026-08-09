import { config } from '../config/config.js';
import { logger } from '../config/logger.js';
import { ContextEngine } from '../context/context-engine.js';
import { PlanningEngine } from '../planner/planning-engine.js';
import { RiskEngine } from '../risk/risk-engine.js';
import { Generator } from '../generators/generator.js';
import { ImpactEngine } from '../impact/impact-engine.js';
import { ApprovalEngine } from '../approval/approval-engine.js';
import { GitHubClient } from '../github/github-client.js';
import { GitHubEngine } from '../github/github-engine.js';
import { Orchestrator } from '../orchestration/orchestrator.js';
import { MCPTransport } from '../mcp/transport.js';
import { MCPClient } from '../mcp/client.js';
import { DataHubClient } from '../mcp/datahub-client.js';
import { Planner, LLMClient } from '../planner/planner.js';
import { MetadataWriter } from '../impact/metadata-writer.js';
import {
  ContextStage,
  PlanningStage,
  RiskStage,
  GeneratorStage,
  ImpactStage,
  ApprovalStage,
  GitHubStage,
} from '../orchestration/stages/index.js';
import { createContainer } from './production-container.js';
import { IdempotencyService } from '../utils/idempotency.js';

/**
 * Development Container
 *
 * Uses mock implementations for external dependencies.
 * Intended for development and testing only.
 * NEVER use in production.
 */

export class DevelopmentContainer {
  readonly context: ContextEngine;

  readonly planning: PlanningEngine;

  readonly risk: RiskEngine;

  readonly generator: Generator;

  readonly impact: ImpactEngine;

  readonly approval: ApprovalEngine;

  readonly github: GitHubEngine;

  readonly orchestrator: Orchestrator;

  constructor() {
    /**
     * Infrastructure
     */

    const mcpTransport = new MCPTransport({
      timeoutMs: 30000,
    });

    const mcpClient = new MCPClient(mcpTransport);

    const datahubClient = new DataHubClient(mcpClient);

    const githubClient: GitHubClient = {
      createPullRequest: async (request) => {
        // Mock implementation for testing
        return {
          number: Math.floor(Math.random() * 1000),
          url: `https://github.com/${request.owner}/${request.repository}/pull/${Math.floor(Math.random() * 1000)}`,
        };
      },
      addLabels: async (prNumber, labels) => {
        // Mock implementation
      },
      requestReviewers: async (prNumber, reviewers) => {
        // Mock implementation
      },
      createBranch: async (request) => {
        // Mock implementation
      },
      getBranch: async (request) => {
        // Mock implementation
        return { exists: false };
      },
      commitFile: async (request) => {
        // Mock implementation
      },
      checkPullRequestExists: async (request) => {
        // Mock implementation
        return { exists: false };
      },
    };

    /**
     * Generators
     */

    // Note: Generator now uses PlatformAwareSQLGenerator internally
    // and does not require PrismaGenerator as a dependency
    // Prisma is only used for agent's internal persistence (Run, GeneratedArtifact, ImpactReport, Writeback)

    this.generator = new Generator();

    /**
     * Idempotency - Mock implementation for development
     */
    // For development, we create a mock idempotency service that bypasses DB
    const mockIdempotencyService: IdempotencyService = {
      check: async () => ({
        isDuplicate: false,
        status: undefined,
        cachedResult: undefined,
      }),
      record: async () => undefined,
    } as any;

    /**
     * Application
     */

    this.context = new ContextEngine(datahubClient);

    // Mock LLM client for development
    const mockLLMClient: any = {
      generate: async () => JSON.stringify({
        summary: "Mock plan",
        intent: "mock",
        affectedDataset: "mock",
        affectedColumns: [],
        requiredChanges: [],
        confidence: 0.5,
        requiresApproval: false,
      }),
    };
    this.planning = new PlanningEngine(new Planner(mockLLMClient));
    this.risk = new RiskEngine();

    // Mock metadata writer for development
    const mockMetadataWriter: any = {
      write: async () => undefined,
    };
    this.impact = new ImpactEngine(mockMetadataWriter);
    this.approval = new ApprovalEngine();
    this.github = new GitHubEngine(githubClient);

    const contextStage = new ContextStage(this.context, mockIdempotencyService);
    const planningStage = new PlanningStage(
      this.planning,
      mockIdempotencyService,
    );
    const riskStage = new RiskStage(this.risk, mockIdempotencyService);
    const generatorStage = new GeneratorStage(
      this.generator,
      mockIdempotencyService,
    );
    const impactStage = new ImpactStage(this.impact, mockIdempotencyService);
    const approvalStage = new ApprovalStage(
      this.approval,
      mockIdempotencyService,
      false,
    );
    const githubStage = new GitHubStage(
      this.github,
      config.github.owner,
      config.github.repository,
      config.github.baseBranch,
      mockIdempotencyService,
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
      mockIdempotencyService,
    );
  }
}

export const container = createContainer();
