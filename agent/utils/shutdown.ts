import { logger } from '../config/logger.js';

export async function gracefulShutdown() {
  logger.info('Shutting down...');

  process.exit(0);
}
