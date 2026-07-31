import express, { Request, Response } from 'express';
import { logger } from '../../config/logger.js';
import { container } from '../../container/container.js';
import { ChangeRequest } from '../../mcp/types.js';

const app = express();

app.use(express.json());

// In-memory store for demo purposes (replace with database in production)
const requestStore = new Map<string, any>();
const metricsStore = {
  schemaChanges: 127,
  pendingReviews: 8,
  criticalChanges: 3,
  autoApproved: 89,
  prsCreated: 95,
  avgRiskScore: 42,
  avgReviewTime: 45, // minutes
};

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

// Get metrics
app.get('/api/v1/metrics', (req: Request, res: Response) => {
  res.json({
    status: 'success',
    data: metricsStore,
  });
});

// Submit schema change request
app.post('/api/v1/requests', async (req: Request, res: Response) => {
  try {
    const { description, datasetUrn, requestedBy, priority } = req.body;

    if (!description || !requestedBy) {
      return res.status(400).json({
        status: 'error',
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

    // Store the request
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const storedRequest = {
      id: requestId,
      request,
      result,
      status: result.status || 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    requestStore.set(requestId, storedRequest);

    // Update metrics
    metricsStore.schemaChanges++;

    res.json({
      status: 'success',
      data: { ...result, id: requestId },
    });
  } catch (error: any) {
    logger.error('Failed to process request', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to process request',
      message: error.message,
    });
  }
});

// Get request status by ID
app.get('/api/v1/requests/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const storedRequest = requestStore.get(id);

  if (!storedRequest) {
    return res.status(404).json({
      status: 'error',
      error: 'Request not found',
    });
  }

  res.json({
    status: 'success',
    data: storedRequest,
  });
});

// List recent requests
app.get('/api/v1/requests', (req: Request, res: Response) => {
  const { status, limit = 50, offset = 0 } = req.query;

  let requests = Array.from(requestStore.values());

  // Filter by status if provided
  if (status) {
    requests = requests.filter((r: any) => r.status === status);
  }

  // Sort by createdAt descending
  requests.sort((a: any, b: any) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Apply pagination
  const paginatedRequests = requests.slice(
    parseInt(offset as string),
    parseInt(offset as string) + parseInt(limit as string)
  );

  res.json({
    status: 'success',
    data: paginatedRequests,
    total: requests.length,
  });
});

// Approve or reject a request
app.post('/api/v1/requests/:id/approval', (req: Request, res: Response) => {
  const { id } = req.params;
  const { approved, reviewer, comment } = req.body;

  const storedRequest = requestStore.get(id);

  if (!storedRequest) {
    return res.status(404).json({
      status: 'error',
      error: 'Request not found',
    });
  }

  // Update the request with approval decision
  storedRequest.approval = {
    approved,
    reviewer,
    comment,
    decidedAt: new Date().toISOString(),
  };
  storedRequest.status = approved ? 'approved' : 'rejected';
  storedRequest.updatedAt = new Date().toISOString();

  requestStore.set(id, storedRequest);

  // Update metrics
  if (approved) {
    metricsStore.pendingReviews--;
  }

  res.json({
    status: 'success',
    data: storedRequest,
  });
});

// List datasets (placeholder - would query DataHub)
app.get('/api/v1/datasets', (req: Request, res: Response) => {
  const { search, platform, limit = 100 } = req.query;

  // Mock data - replace with actual DataHub query
  const datasets = [
    {
      urn: 'urn:li:dataset:(PROD,customers)',
      name: 'customers',
      platform: 'snowflake',
      description: 'Customer master data',
      owners: [{ urn: 'urn:li:corpuser:alice', name: 'Alice', type: 'CORP_USER' }],
      tags: ['pii', 'core'],
      glossaryTerms: [],
      domain: 'urn:li:domain:customer',
      lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      urn: 'urn:li:dataset:(PROD,orders)',
      name: 'orders',
      platform: 'snowflake',
      description: 'Order transactions',
      owners: [{ urn: 'urn:li:corpuser:bob', name: 'Bob', type: 'CORP_USER' }],
      tags: ['core', 'financial'],
      glossaryTerms: [],
      domain: 'urn:li:domain:orders',
      lastModified: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    },
  ];

  let filteredDatasets = datasets;

  if (search) {
    filteredDatasets = filteredDatasets.filter((d: any) =>
      d.name.toLowerCase().includes((search as string).toLowerCase())
    );
  }

  if (platform) {
    filteredDatasets = filteredDatasets.filter((d: any) =>
      d.platform === platform
    );
  }

  res.json({
    status: 'success',
    data: filteredDatasets.slice(0, parseInt(limit as string)),
  });
});

// Get dataset details
app.get('/api/v1/datasets/:urn', (req: Request, res: Response) => {
  const { urn } = req.params;

  // Mock data - replace with actual DataHub query
  const dataset = {
    urn,
    name: 'customers',
    platform: 'snowflake',
    description: 'Customer master data',
    owners: [{ urn: 'urn:li:corpuser:alice', name: 'Alice', type: 'CORP_USER' }],
    tags: ['pii', 'core'],
    glossaryTerms: [],
    domain: 'urn:li:domain:customer',
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  };

  res.json({
    status: 'success',
    data: dataset,
  });
});

// List pull requests (placeholder - would query GitHub)
app.get('/api/v1/pull-requests', (req: Request, res: Response) => {
  const { status, limit = 50 } = req.query;

  // Mock data - replace with actual GitHub query
  const pullRequests = [
    {
      number: 123,
      title: 'feat: Rename customer_name to full_name',
      status: 'merged',
      author: 'alice@company.com',
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      branch: 'feat/rename-customer-name',
      base: 'main',
      additions: 15,
      deletions: 8,
      reviewers: ['john.doe@company.com'],
      url: 'https://github.com/company/data-migrations/pull/123',
    },
    {
      number: 122,
      title: 'feat: Add index on email column',
      status: 'open',
      author: 'bob@company.com',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      branch: 'feat/email-index',
      base: 'main',
      additions: 22,
      deletions: 0,
      reviewers: ['jane.smith@company.com'],
      url: 'https://github.com/company/data-migrations/pull/122',
    },
  ];

  let filteredPRs = pullRequests;

  if (status) {
    filteredPRs = filteredPRs.filter((pr: any) => pr.status === status);
  }

  res.json({
    status: 'success',
    data: filteredPRs.slice(0, parseInt(limit as string)),
  });
});

// Get pull request details
app.get('/api/v1/pull-requests/:number', (req: Request, res: Response) => {
  const { number } = req.params;

  // Mock data - replace with actual GitHub query
  const pullRequest = {
    number: parseInt(number),
    title: 'feat: Rename customer_name to full_name',
    status: 'merged',
    author: 'alice@company.com',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    branch: 'feat/rename-customer-name',
    base: 'main',
    additions: 15,
    deletions: 8,
    reviewers: ['john.doe@company.com'],
    url: 'https://github.com/company/data-migrations/pull/123',
    body: 'This PR renames customer_name to full_name...',
  };

  res.json({
    status: 'success',
    data: pullRequest,
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error', err);
  res.status(500).json({
    status: 'error',
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
