import { logger } from '../config/logger.js';
import { gracefulShutdown } from '../utils/shutdown.js';
import { startServer } from './api/server.js';

logger.info('Starting LineageGuard Engine');

// Start the API server
startServer(3001)
  .then(() => {
    logger.info('API server started on port 3001');
  })
  .catch((error) => {
    logger.error('Failed to start API server', error);
    process.exit(1);
  });

process.on('SIGINT', gracefulShutdown);

process.on('SIGTERM', gracefulShutdown);

logger.info('Engine Ready');
