import express, { Request, Response } from 'express';
import { logger } from '../../config/logger.js';
import { createContainer } from '../../container/index.js';
import { ChangeRequest } from '../../mcp/types.js';
import {
  ChangeRequestSchema,
  ApprovalRequestSchema,
  sanitizeInput,
  sanitizeUrn,
  isValidEmail,
  isValidUrn,
  isValidPriority,
  maskToken
} from '../../utils/security.js';

const app = express();

// Global container instance - initialized on server start
let globalContainer: ReturnType<typeof createContainer> | null = null;

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
      grok: 'configured',
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
  let requestId: string | undefined;

  try {
    const { description, datasetUrn, requestedBy, priority } = req.body;

    // Validate input using Zod schema
    const validationResult = ChangeRequestSchema.safeParse({
      description: sanitizeInput(description || ''),
      datasetUrn: datasetUrn ? sanitizeUrn(datasetUrn) : undefined,
      requestedBy: sanitizeInput(requestedBy || ''),
      priority: priority || 'medium',
    });

    if (!validationResult.success) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid input: ' + validationResult.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
      });
    }

    const validatedData = validationResult.data;

    // Additional validation
    if (validatedData.datasetUrn && !isValidUrn(validatedData.datasetUrn)) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid dataset URN format',
      });
    }

    if (!isValidEmail(validatedData.requestedBy)) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid email format for requestedBy',
      });
    }

    if (validatedData.priority && !isValidPriority(validatedData.priority)) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid priority value. Must be: low, medium, or high',
      });
    }

    const request: ChangeRequest = {
      description: validatedData.description,
      datasetUrn: validatedData.datasetUrn || '',
      requestedBy: validatedData.requestedBy,
      priority: validatedData.priority,
    };

    logger.info({
      event: 'processing_request',
      description: request.description,
      requestedBy: request.requestedBy,
    }, 'Processing schema change request');

    if (!globalContainer) {
      throw new Error('Server not properly initialized: container is not available');
    }

    const result = await globalContainer.orchestrator.execute(request);

    // Store the request
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const storedRequest = {
      id: requestId,
      request,
      result,
      status: 'completed' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    requestStore.set(requestId, storedRequest);

    // Update metrics
    metricsStore.schemaChanges++;

    res.json({
      status: 'success',
      data: { 
        ...result, 
        id: requestId,
        performance: result.performance 
      },
    });
  } catch (error: any) {
    // Log full error details with proper error serialization
    logger.error(
      {
        err: error,
        requestId,
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorStack: error?.stack,
        errorCause: error?.cause,
        errorName: error?.name,
        rawError: String(error),
      },
      'Failed to process request'
    );

    // Determine user-friendly error message
    let userMessage = 'An unexpected error occurred while processing your request';
    let statusCode = 500;

    if (error?.message?.includes('Stage "context" failed')) {
      userMessage = 'Unable to retrieve dataset metadata. Please check the dataset URN and try again.';
      statusCode = 400;
    } else if (error?.message?.includes('Stage "planning" failed')) {
      userMessage = 'Unable to generate execution plan. The request description may be unclear.';
      statusCode = 400;
    } else if (error?.message?.includes('Stage "risk" failed')) {
      userMessage = 'Unable to assess risk. Please try again.';
      statusCode = 500;
    } else if (error?.message?.includes('Stage "generator" failed')) {
      userMessage = 'Unable to generate migration. The schema change may not be supported.';
      statusCode = 400;
    } else if (error?.message?.includes('Stage "impact" failed')) {
      userMessage = 'Unable to analyze impact. Please try again.';
      statusCode = 500;
    } else if (error?.message?.includes('Stage "approval" failed')) {
      userMessage = 'Unable to process approval. Please try again.';
      statusCode = 500;
    } else if (error?.message?.includes('Stage "github" failed')) {
      userMessage = 'Unable to create pull request. Please check GitHub credentials and try again.';
      statusCode = 500;
    } else if (error?.message?.includes('Missing required fields')) {
      userMessage = error.message;
      statusCode = 400;
    } else if (error?.message) {
      userMessage = error.message;
    }

    res.status(statusCode).json({
      status: 'error',
      error: userMessage,
    });
  }
});

// Get request status by ID
app.get('/api/v1/requests/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      status: 'error',
      error: 'Missing request ID',
    });
  }
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
  if (!id) {
    return res.status(400).json({
      status: 'error',
      error: 'Missing request ID',
    });
  }

  const { approved, reviewer, comment } = req.body;

  // Validate approval request
  const validationResult = ApprovalRequestSchema.safeParse({
    approved,
    reviewer: reviewer ? sanitizeInput(reviewer) : '',
    comment: comment ? sanitizeInput(comment) : undefined,
    decidedAt: req.body.decidedAt,
  });

  if (!validationResult.success) {
    return res.status(400).json({
      status: 'error',
      error: 'Invalid approval input: ' + validationResult.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
    });
  }

  const validatedData = validationResult.data;

  if (!isValidEmail(validatedData.reviewer)) {
    return res.status(400).json({
      status: 'error',
      error: 'Invalid email format for reviewer',
    });
  }

  const storedRequest = requestStore.get(id);

  if (!storedRequest) {
    return res.status(404).json({
      status: 'error',
      error: 'Request not found',
    });
  }

  // Update the request with approval decision
  storedRequest.approval = {
    approved: validatedData.approved,
    reviewer: validatedData.reviewer,
    comment: validatedData.comment,
    decidedAt: validatedData.decidedAt || new Date().toISOString(),
  };
  storedRequest.status = validatedData.approved ? 'approved' : 'rejected';
  storedRequest.updatedAt = new Date().toISOString();

  requestStore.set(id, storedRequest);

  // Update metrics
  if (validatedData.approved) {
    metricsStore.pendingReviews--;
  }

  logger.info({
    event: 'approval_processed',
    requestId: id,
    approved: validatedData.approved,
    reviewer: validatedData.reviewer,
  }, 'Approval processed');

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
    data: filteredPRs.slice(0, parseInt(limit as string) || 50),
  });
});

// Get pull request details
app.get('/api/v1/pull-requests/:number', (req: Request, res: Response) => {
  const { number } = req.params;
  if (!number) {
    return res.status(400).json({
      status: 'error',
      error: 'Missing pull request number',
    });
  }

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
  // Create the container with all dependencies
  globalContainer = createContainer();

  // Initialize MCP client before starting server
  try {
    logger.info({
      event: "mcp_initialization_started",
    }, "🔌 Initializing MCP client...");
    
    await globalContainer.getMcpClient().initialize();
    
    logger.info({
      event: "mcp_initialization_completed",
      isConnected: globalContainer.getMcpClient().isConnected(),
    }, "✅ MCP client initialized successfully");
  } catch (error) {
    logger.error({
      event: "mcp_initialization_failed",
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    }, "❌ Failed to initialize MCP client");
    throw error;
  }

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
