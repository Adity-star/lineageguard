import { config } from "../config/config.js";

import { ContextEngine } from "../context/context-engine.js";
import { PlanningEngine } from "../planner/planning-engine.js";
import { RiskEngine } from "../risk/risk-engine.js";
import { Generator } from "../generators/generator.js";
import { ImpactEngine } from "../impact/impact-engine.js";
import { OctokitGitHubClient } from "../github/octokit-client.js";
import { GitHubEngine } from "../github/github-engine.js";
import { Orchestrator } from "../orchestration/orchestrator.js";
import { AnthropicClient } from "../llm/anthropic.js";
import { MCPTransport } from "../mcp/transport.js";
import { MCPClient } from "../mcp/client.js";
import { DataHubClient } from "../mcp/datahub-client.js";
import { PrismaGenerator } from "../generators/prisma.js";
import { Planner, LLMClient } from "../planner/planner.js";
import { LLMEditor } from "../generators/llm-editor.js";
import { PrismaRunner, PrismaValidationResult, PrismaMigrationResult } from "../generators/prisma-runner.js";
import { MetadataWriter } from "../impact/metadata-writer.js";
import { ContextStage, PlanningStage, RiskStage, GeneratorStage, ImpactStage, GitHubStage } from "../orchestration/stages/index.js";

/**
 * Composition Root
 *
 * Every dependency in the application
 * is created here exactly once.
 */

export class ApplicationContainer {

  readonly context: ContextEngine;

  readonly planning: PlanningEngine;

  readonly risk: RiskEngine;

  readonly generator: Generator;

  readonly impact: ImpactEngine;

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

    const anthropicClient = new AnthropicClient({
      apiKey: config.anthropic.apiKey,
      model: "claude-3-5-sonnet-20241022",
      maxTokens: 4096,
      temperature: 0,
    });

    const githubClient = new OctokitGitHubClient(
      config.github.token,
      config.github.owner,
      config.github.repository
    );

    /**
     * Generators
     */

    const llmEditor: LLMEditor = {
      editSchema: async (request) => {
        const response = await anthropicClient.message({
          system: "You are a database schema expert. Edit the Prisma schema according to the execution plan.",
          messages: [
            {
              role: "user",
              content: `Current schema:\n${request.schema}\n\nExecution plan:\n${JSON.stringify(request.plan, null, 2)}\n\nReturn the updated Prisma schema only.`,
            },
          ],
        });

        return {
          updatedSchema: response.content,
        };
      },
    };

    const prismaRunner: PrismaRunner = {
      validate: async (schema: string): Promise<PrismaValidationResult> => {
        // Placeholder - in production, this would run prisma validate
        return { valid: true, errors: [] };
      },
      generateMigration: async (originalSchema: string, updatedSchema: string): Promise<PrismaMigrationResult> => {
        // Placeholder - in production, this would run prisma migrate diff
        return { sql: "-- Migration SQL would be generated here" };
      },
    };

    const prismaGenerator = new PrismaGenerator(llmEditor, prismaRunner);

    /**
     * Engines
     */

    const llmClient: LLMClient = {
      generate: async (systemPrompt: string, userPrompt: string): Promise<string> => {
        const response = await anthropicClient.message({
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });
        return response.content;
      },
    };

    const planner = new Planner(llmClient);

    const metadataWriter: MetadataWriter = {
      write: async (report) => {
        // Placeholder - in production, this would write to DataHub
        console.log("Writing impact report to DataHub:", report.summary);
      },
    };

    this.context = new ContextEngine(datahubClient);

    this.planning = new PlanningEngine(planner);

    this.risk = new RiskEngine();

    this.generator = new Generator(prismaGenerator);

    this.impact = new ImpactEngine(metadataWriter);

    this.github = new GitHubEngine(githubClient);

    /**
     * Application
     */

    const contextStage = new ContextStage(this.context);
    const planningStage = new PlanningStage(this.planning);
    const riskStage = new RiskStage(this.risk);
    const generatorStage = new GeneratorStage(this.generator);
    const impactStage = new ImpactStage(this.impact);
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
        githubStage,
      ],
      config.github.owner,
      config.github.repository,
      config.github.baseBranch
    );

  }

}

export const container = new ApplicationContainer();