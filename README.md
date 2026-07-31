# LineageGuard

AI-powered schema change governance agent built around DataHub. LineageGuard reads metadata graphs, understands the impact of requested changes, creates validated migrations, calculates deterministic risk, requires human approval for risky changes, writes governance metadata back to DataHub, and finally opens a GitHub pull request.

## Core Philosophy

**Read → Understand → Plan → Validate → Generate → Assess → Human Approval → Write Back → GitHub PR**

LineageGuard is not an AI that writes migrations. It is an AI governance platform that uses metadata as the source of truth to produce safe, validated, explainable, reviewable, and auditable schema changes.

## Architecture

### End-to-End Workflow

1. **User Request**: Submit a natural language schema change
2. **Context Engine**: Gather DataHub metadata (schema, lineage, ownership, documentation, glossary, query usage)
3. **Planning Engine (Claude)**: Create an ExecutionPlan
4. **Risk Engine**: Compute deterministic risk score
5. **Generator Engine**: Edit Prisma schema, generate validated SQL, rollback, documentation, and optional dbt patches
6. **Impact Engine**: Build Impact Report with affected assets and recommendations
7. **Approval Engine**: 
   - LOW risk → optional auto approval
   - HIGH/CRITICAL → human approval required
8. **If Approved**: Write governance metadata to DataHub, create GitHub branch, commit artifacts, open Pull Request
9. **If Rejected**: Record decision and rationale, do not update DataHub or GitHub

### Runtime Architecture

```
User Request → MCP/DataHub → Context Engine → Planning Engine → Risk Engine → 
Generator Engine → Impact Engine → Approval Engine → DataHub Write-back → GitHub Engine → Pull Request
```

### Engines

- **MCP Layer**: Authentication, DataHub communication, Tool execution
- **Context Engine**: Reads schema, lineage, ownership, documentation, glossary, query usage → ContextBundle
- **Planning Engine (LLM)**: Input: User request + ContextBundle → Output: ExecutionPlan
- **Risk Engine**: Deterministic scoring → Risk score, severity, approval requirement
- **Generator Engine**: Updated Prisma schema, SQL migration, Rollback SQL, Documentation, dbt patch
- **Impact Engine**: ImpactReport, affected assets, recommendations, approval requirement
- **Approval Engine**: States: Pending/Approved/Rejected, stores reviewer, timestamp, reason, decision
- **GitHub Engine**: Creates branch, commit, Pull Request, labels, reviewers

## Installation

### Prerequisites

- Node.js >= 22
- npm or yarn
- Docker (optional, for containerized deployment)
- DataHub instance (for production use)
- Anthropic API key
- GitHub personal access token
- Supabase project (optional, for additional storage)

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-org/lineageguard.git
cd lineageguard/agent
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key

# DataHub
DATAHUB_GMS_URL=http://localhost:8080
DATAHUB_GMS_TOKEN=your_datahub_token
DATAHUB_MCP_URL=http://localhost:8080
DATAHUB_MCP_TOKEN=your_datahub_mcp_token

# GitHub
GITHUB_TOKEN=your_github_token
GITHUB_OWNER=your_github_username
GITHUB_REPOSITORY=your_repository_name
GITHUB_BASE_BRANCH=main

# Supabase (optional)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Prisma (optional)
DATABASE_URL=your_database_url

# Application
NODE_ENV=development
LOG_LEVEL=info
```

4. **Build the project**
```bash
npm run build
```

## Running LineageGuard

### CLI Interface

Submit a schema change request:
```bash
npm run cli request "Add a new column 'email' to the users table" \
  --dataset "urn:li:dataset:(urn:li:dataPlatform:mysql,users,PROD)" \
  --requested-by "user@example.com" \
  --priority high
```

Check system health:
```bash
npm run cli health
```

Start the REST API server:
```bash
npm run cli serve --port 3000
```

### REST API

Start the server:
```bash
npm run start
```

API endpoints:
- `GET /health` - Health check
- `POST /api/v1/requests` - Submit schema change request
- `GET /api/v1/requests/:id` - Get request status
- `GET /api/v1/requests` - List recent requests

Example request:
```bash
curl -X POST http://localhost:3000/api/v1/requests \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Add a new column 'email' to the users table",
    "datasetUrn": "urn:li:dataset:(urn:li:dataPlatform:mysql,users,PROD)",
    "requestedBy": "user@example.com",
    "priority": "high"
  }'
```

### Docker Deployment

Build and run with Docker Compose:
```bash
cd agent
docker-compose up -d
```

This will start:
- LineageGuard API server (port 3000)
- DataHub GMS (port 8080)
- Kafka, Elasticsearch, Neo4j, MySQL (DataHub dependencies)

## Development

### Project Structure

```
agent/
├── src/
│   ├── cli.ts              # CLI interface
│   ├── api/
│   │   └── server.ts       # REST API server
│   ├── index.ts            # Entry point
│   └── services/           # Additional services
├── config/
│   ├── config.ts           # Application configuration
│   ├── env.ts              # Environment validation
│   ├── logger.ts           # Structured logging
│   └── constants.ts        # Constants
├── container/
│   └── container.ts        # Dependency injection
├── context/
│   ├── context-engine.ts   # Context gathering
│   ├── pipeline.ts         # Context pipeline
│   └── stages/             # Context collection stages
├── planner/
│   ├── planning-engine.ts   # Planning orchestration
│   ├── planner.ts          # LLM planning
│   ├── prompt.ts           # Prompt templates
│   └── types.ts            # Planning types
├── risk/
│   ├── risk-engine.ts      # Risk orchestration
│   ├── scorer.ts           # Risk scoring
│   ├── calculator.ts       # Risk calculation
│   └── types.ts            # Risk types
├── generators/
│   ├── generator.ts        # Generation orchestration
│   ├── prisma.ts           # Prisma schema editing
│   ├── sql.ts              # SQL generation
│   ├── rollback.ts         # Rollback generation
│   ├── documentation.ts   # Documentation generation
│   └── types.ts            # Generation types
├── impact/
│   ├── impact-engine.ts    # Impact orchestration
│   ├── scorer.ts           # Impact scoring
│   ├── report.ts           # Report building
│   ├── recommendations.ts  # Recommendation generation
│   └── types.ts            # Impact types
├── github/
│   ├── github-engine.ts    # GitHub orchestration
│   ├── octokit-client.ts   # GitHub API client
│   ├── branch.ts           # Branch operations
│   ├── commit.ts           # Commit operations
│   ├── pull-request.ts     # PR operations
│   └── types.ts            # GitHub types
├── orchestration/
│   ├── orchestrator.ts     # Workflow orchestration
│   ├── pipeline.ts         # Pipeline execution
│   ├── stages/             # Workflow stages
│   └── types.ts            # Workflow types
├── mcp/
│   ├── client.ts           # MCP client
│   ├── transport.ts        # MCP transport
│   ├── datahub-client.ts   # DataHub client
│   ├── tools/              # DataHub MCP tools
│   └── types.ts            # MCP types
├── llm/
│   ├── anthropic.ts        # Anthropic/Claude client
│   └── prompts/            # LLM prompts
└── utils/
    ├── retry.ts            # Retry utilities
    └── shutdown.ts         # Graceful shutdown
```

### Available Scripts

```bash
# Development
npm run dev          # Watch mode with tsx
npm run start        # Run with tsx
npm run build        # Build TypeScript
npm run lint         # Run ESLint
npm run format       # Format with Prettier

# Prisma (if using)
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate    # Run Prisma migrations
npm run prisma:studio    # Open Prisma Studio

# CLI
npm run cli request <description>  # Submit request
npm run cli health                # Health check
npm run cli serve                 # Start API server
```

### Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## Production Deployment

### Docker Deployment

1. **Build the Docker image**
```bash
docker build -t lineageguard:latest -f agent/Dockerfile agent
```

2. **Run with Docker Compose**
```bash
docker-compose -f agent/docker-compose.yml up -d
```

3. **View logs**
```bash
docker-compose -f agent/docker-compose.yml logs -f lineageguard
```

### Kubernetes Deployment

Create a Kubernetes deployment using the provided Docker image:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lineageguard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lineageguard
  template:
    metadata:
      labels:
        app: lineageguard
    spec:
      containers:
      - name: lineageguard
        image: lineageguard:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: lineageguard-secrets
              key: anthropic-api-key
        # Add other environment variables
```

### CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that:
- Lints code
- Builds TypeScript
- Runs tests
- Performs security scanning
- Builds and pushes Docker images
- Deploys to production

## Configuration

### Risk Thresholds

Configure risk thresholds in the Risk Engine:
- **LOW**: Optional auto-approval
- **MEDIUM**: Configurable approval
- **HIGH**: Manual approval required
- **CRITICAL**: Manual approval required

### Approval Policy

Configure approval policy in the Approval Engine:
- Set which risk levels require human approval
- Configure auto-approval for low-risk changes
- Set up approval workflows

### GitHub Integration

Configure GitHub integration:
- Set up GitHub personal access token with repo permissions
- Configure repository owner and name
- Set default base branch
- Configure labels and reviewers

## Monitoring and Observability

### Logging

LineageGuard uses structured logging with Pino:
- Correlation IDs for request tracing
- Structured JSON logs in production
- Pretty-printed logs in development
- Log levels: trace, debug, info, warn, error, fatal

### Health Checks

- `GET /health` - Service health check
- Docker health check configured
- Kubernetes liveness and readiness probes

### Metrics

The system logs:
- Request duration
- API call latency
- Error rates
- Retry attempts
- Token usage (Anthropic)

## Security

### Secrets Management

- Never commit `.env` files
- Use environment variables for secrets
- Use secret managers in production (AWS Secrets Manager, HashiCorp Vault, etc.)
- Rotate API keys regularly

### API Security

- Validate all input with Zod schemas
- Use HTTPS in production
- Implement rate limiting
- Add authentication/authorization for API endpoints

### DataHub Security

- Use secure tokens for DataHub access
- Implement proper RBAC in DataHub
- Audit all metadata changes

## Troubleshooting

### Common Issues

**MCP Connection Failed**
- Verify DataHub GMS URL and token
- Check network connectivity
- Ensure DataHub is running

**Anthropic API Errors**
- Verify API key is valid
- Check rate limits
- Ensure sufficient credits

**GitHub API Errors**
- Verify GitHub token has necessary permissions
- Check repository access
- Ensure branch exists

**Build Errors**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check TypeScript version compatibility
- Verify all dependencies are installed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Run lint: `npm run lint`
6. Submit a pull request

## License

ISC

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/lineageguard/issues
- Documentation: https://docs.lineageguard.dev
- Email: support@lineageguard.dev 
