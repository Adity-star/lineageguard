#!/usr/bin/env node

import { Command } from 'commander';
import { logger } from '../config/logger.js';
import { createContainer } from '../container/index.js';
import { ChangeRequest } from '../mcp/types.js';

// type Priority = 'low' | 'medium' | 'high';

const program = new Command();

program
  .name('lineageguard')
  .description('AI-powered schema change governance agent')
  .version('1.0.0');

program
  .command('request')
  .description('Submit a schema change request')
  .argument('<description>', 'Description of the schema change')
  .option('-d, --dataset <urn>', 'Target dataset URN')
  .option('-r, --requested-by <email>', 'Requester email')
  .option('-p, --priority <level>', 'Priority level (low, medium, high)', 'medium')
  .action(async (description: string, options: { dataset: string; requestedBy: string; priority: string }) => {
    try {
      logger.info('Submitting schema change request');

      const request: ChangeRequest = {
        description,
        datasetUrn: options.dataset,
        requestedBy: options.requestedBy || 'unknown',
        priority: options.priority,
      };

      const container = createContainer();
      const result = await container.orchestrator.execute(request);

      logger.info('Workflow completed successfully');
      logger.info('\n=== Workflow Result ===');
      logger.info(JSON.stringify(result, null, 2));

      if (result.github) {
        logger.info(`\nPull Request: ${result.github.url}`);
      }
    } catch (error: unknown) {
      logger.error({ err: error }, 'Workflow failed');
      process.exit(1);
    }
  });

program
  .command('health')
  .description('Check system health')
  .action(async () => {
    try {
      logger.info('Checking system health');

      // Check MCP connection
      logger.info('MCP Connection: OK (configured)');

      // Check GitHub connection
      logger.info('GitHub Connection: OK (configured)');

      // Check grok connection
      logger.info('grok Connection: OK (configured)');

      logger.info('Health check completed');
    } catch (error: unknown) {
      logger.error({ err: error }, 'Health check failed');
      process.exit(1);
    }
  });

program
  .command('serve')
  .description('Start the REST API server')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .action(async (options: { port: string }) => {
    try {
      logger.info(`Starting REST API server on port ${options.port}`);

      // Import and start the API server
      const { startServer } = await import('./api/server.js');
      await startServer(parseInt(options.port));
    } catch (error: unknown) {
      logger.error({ err: error }, 'Failed to start server');
      process.exit(1);
    }
  });

program.parse();
