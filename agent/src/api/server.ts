import express, { Request, Response } from 'express';
import { logger } from '../../config/logger.js';
import { container } from '../../container/container.js';
import { ChangeRequest } from '../../mcp/types.js';

const app = express();

app.use(express.json());

// Middleware for logging
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      mcp: 'configured',
      github: 'configured',
      anthropic: 'configured',
    },
  });
});

// Submit schema change request
app.post('/api/v1/requests', async (req: Request, res: Response) => {
  try {
    const { description, datasetUrn, requestedBy, priority } = req.body;

    if (!description || !requestedBy) {
      return res.status(400).json({
        error: 'Missing required fields: description, requestedBy',
      });
    }

    const request: ChangeRequest = {
      description,
      datasetUrn,
      requestedBy,
      priority: priority || 'medium',
    };

    logger.info('Processing schema change request');

    const result = await container.orchestrator.execute(request);

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to process request', error);
    res.status(500).json({
      error: 'Failed to process request',
      message: error.message,
    });
  }
});

// Get request status (placeholder)
app.get('/api/v1/requests/:id', (req: Request, res: Response) => {
  // Placeholder - in production, this would query a database
  res.json({
    status: 'not_implemented',
    message: 'Request status tracking not yet implemented',
  });
});

// List recent requests (placeholder)
app.get('/api/v1/requests', (req: Request, res: Response) => {
  // Placeholder - in production, this would query a database
  res.json({
    status: 'not_implemented',
    message: 'Request listing not yet implemented',
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

export async function startServer(port: number): Promise<void> {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      logger.info(`REST API server listening on port ${port}`);
      resolve();
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down server');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down server');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  });
}

export { app };
