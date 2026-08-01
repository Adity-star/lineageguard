import { config } from "../config/config.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

import { ContextEngine } from "../context/context-engine.js";
import { PlanningEngine } from "../planner/planning-engine.js";
import { RiskEngine } from "../risk/risk-engine.js";
import { Generator } from "../generators/generator.js";
import { ImpactEngine } from "../impact/impact-engine.js";
import { ApprovalEngine } from "../approval/approval-engine.js";
import { GitHubEngine } from "../github/github-engine.js";
import { Orchestrator } from "../orchestration/orchestrator.js";
import { AnthropicClient, AnthropicConfig } from "../llm/anthropic.js";
import { AnthropicLLMAdapter } from "../llm/anthropic-adapter.js";
import { MCPTransport } from "../mcp/transport.js";
import { MCPClient } from "../mcp/client.js";
import { DataHubClient } from "../mcp/datahub-client.js";
import { PrismaGenerator } from "../generators/prisma.js";
import { Planner } from "../planner/planner.js";
import { AnthropicSchemaEditor } from "../generators/anthropic-schema-editor.js";
import { PrismaCliRunner } from "../generators/prisma-cli-runner.js";
import { DataHubRealWriter } from "../impact/datahub-real-writer.js";
import { OctokitRealClient } from "../github/octokit-real-client.js";
import { ContextStage, PlanningStage, RiskStage, GeneratorStage, ImpactStage, ApprovalStage, GitHubStage } from "../orchestration/stages/index.js";

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

  constructor() {

    /**
     * Infrastructure - Real implementations only
     */

    const mcpTransport = new MCPTransport({
      timeoutMs: 30000,
    });

    const mcpClient = new MCPClient(mcpTransport);

    const datahubClient = new DataHubClient(mcpClient);

    // Real Anthropic client
    const anthropicConfig: AnthropicConfig = {
      apiKey: config.anthropic.apiKey,
      model: "claude-3-5-sonnet-20241022",
      maxTokens: 4096,
      temperature: 0,
    };

    const anthropicClient = new AnthropicClient(anthropicConfig);
    const llmAdapter = new AnthropicLLMAdapter(anthropicClient);

    // Real GitHub client
    const githubClient = new OctokitRealClient(
      config.github.token,
      config.github.owner,
      config.github.repository
    );

    /**
     * Generators - Real implementations
     */

    const llmEditor = new AnthropicSchemaEditor(anthropicClient, anthropicConfig);
    const prismaRunner = new PrismaCliRunner();
    const prismaGenerator = new PrismaGenerator(llmEditor, prismaRunner);

    /**
     * Engines
     */

    const planner = new Planner(llmAdapter);

    const metadataWriter = new DataHubRealWriter(datahubClient);

    this.context = new ContextEngine(datahubClient);

    this.planning = new PlanningEngine(planner);

    this.risk = new RiskEngine();

    this.generator = new Generator(prismaGenerator);

    this.impact = new ImpactEngine(metadataWriter);

    this.approval = new ApprovalEngine();

    this.github = new GitHubEngine(githubClient);

    /**
     * Application
     */

    const contextStage = new ContextStage(this.context);
    const planningStage = new PlanningStage(this.planning);
    const riskStage = new RiskStage(this.risk);
    const generatorStage = new GeneratorStage(this.generator);
    const impactStage = new ImpactStage(this.impact);
    const approvalStage = new ApprovalStage(this.approval, false);
    const githubStage = new GitHubStage(
      this.github,
      config.github.owner,
      config.github.repository,
      config.github.baseBranch
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
      config.github.baseBranch
    );

    logger.info({
      event: "production_container_initialized",
      anthropicModel: anthropicConfig.model,
      githubOwner: config.github.owner,
      githubRepository: config.github.repository,
      datahubUrl: config.datahub.url,
    }, "Production container initialized with real implementations");

  }

}

/**
 * Factory function to create the appropriate container based on environment
 */
export function createContainer() {
  const isProduction = env.NODE_ENV === "production";
  const isDevelopment = env.NODE_ENV === "development";

  if (isProduction) {
    logger.info("Creating PRODUCTION container with real implementations");
    return new ProductionContainer();
  }

  if (isDevelopment) {
    // In development, use production container by default
    // Can be overridden with USE_MOCKS=true
    const useMocks = process.env.USE_MOCKS === "true";
    
    if (useMocks) {
      logger.info("Creating DEVELOPMENT container with MOCK implementations");
      // Import the development container with mocks
      const { ApplicationContainer } = require("./container.js");
      return new ApplicationContainer();
    }
    
    logger.info("Creating DEVELOPMENT container with REAL implementations");
    return new ProductionContainer();
  }

  // Default to production container for test
  logger.info("Creating PRODUCTION container (default)");
  return new ProductionContainer();
}
