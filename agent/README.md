# LineageGuard Agent

Backend service for LineageGuard - AI-powered schema change governance.

## Overview

The agent is the core orchestration engine that:
- Gathers context from DataHub via MCP
- Plans migrations using Claude AI
- Calculates deterministic risk scores
- Generates validated SQL with rollback scripts
- Analyzes downstream impact
- Manages human approval workflows
- Writes metadata back to DataHub
- Creates GitHub pull requests

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Orchestrator                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Context  │ │ Planning │ │   Risk   │ │Generator │  │
│  │  Engine  │ │  Engine  │ │  Engine  │ │  Engine  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       │            │            │            │          │
│       ▼            ▼            ▼            ▼          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Impact  │ │ Approval │ │ DataHub  │ │  GitHub  │  │
│  │  Engine  │ │  Engine  │ │  Writer  │ │  Engine  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Components

### Context Engine
- Reads schema, lineage, ownership from DataHub
- Collects documentation, glossary, usage statistics
- Builds ContextBundle for planning

### Planning Engine
- Uses Claude AI to generate ExecutionPlan
- Understands natural language requests
- Maps to concrete schema changes

### Risk Engine
- Deterministic risk scoring (0-100)
- Considers downstream dependencies
- Triggers approval requirements

### Generator Engine
- Edits Prisma schema
- Generates validated SQL
- Creates rollback scripts
- Writes documentation

### Impact Engine
- Identifies affected assets
- Generates recommendations
- Builds ImpactReport

### Approval Engine
- Manages approval workflow
- Stores decisions and rationale
- Supports auto-approval for low-risk changes

### GitHub Engine
- Creates branches
- Commits artifacts
- Opens pull requests
- Adds labels and reviewers

## Installation

```bash
cd agent
npm install
cp .env.example .env
```

## Configuration

Edit `.env` with your settings:

```env
# Anthropic
ANTHROPIC_API_KEY=your_key

# DataHub
DATAHUB_GMS_URL=http://localhost:8080
DATAHUB_GMS_TOKEN=your_token

# GitHub
GITHUB_TOKEN=your_token
GITHUB_OWNER=your_username
GITHUB_REPOSITORY=your_repo
GITHUB_BASE_BRANCH=main

# Application
NODE_ENV=development
LOG_LEVEL=info
```

## Running

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Start Server
```bash
npm run start
```

### CLI
```bash
npm run cli request "Add column email to users"
npm run cli health
```

## API Endpoints

- `GET /api/v1/health` - Health check
- `POST /api/v1/requests` - Submit schema change
- `GET /api/v1/requests/:id` - Get request status
- `GET /api/v1/requests` - List recent requests
- `POST /api/v1/requests/:id/approval` - Approve/reject

## Project Structure

```
agent/
├── context/          # DataHub metadata gathering
├── planner/          # AI planning with Claude
├── risk/             # Risk scoring
├── generators/       # SQL & schema generation
├── impact/           # Impact analysis
├── approval/         # Approval workflow
├── github/           # GitHub automation
├── orchestration/    # Pipeline orchestration
├── mcp/              # DataHub MCP client
├── llm/              # Claude client
├── config/           # Configuration
├── utils/            # Utilities
└── src/              # Entry points
```

## Security

- Input validation with Zod schemas
- Prompt sanitization for LLM calls
- SQL injection prevention
- Token masking in logs
- Secrets in .env only

## Performance

All stages are timed:
- Context retrieval
- Planning (Claude latency)
- Risk calculation
- SQL generation
- Impact analysis
- Approval processing
- GitHub PR creation

Metrics returned in API responses.

## Docker

```bash
docker build -t lineageguard-agent .
docker run -p 3001:3001 lineageguard-agent
```

Or with Docker Compose:
```bash
docker compose up
```
