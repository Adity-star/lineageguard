# LineageGuard

### AI-Powered Schema Change Governance Agent

LineageGuard turns natural-language database change requests into governed, risk-aware, auditable changes — using real DataHub context, LLM planning, impact analysis, platform-aware SQL generation, approval gates, and GitHub pull requests.

---

## The Problem

Database schema changes are easy to request but difficult to govern.

A simple request such as:

```text
"Add Customerbalance_9 to users"
```

can have consequences for:

* downstream datasets
* dashboards
* queries
* pipelines
* data quality
* governance
* production systems

Most AI tools can generate SQL.

The harder problem is determining:

> **Should this change happen, what could it break, and how should it safely reach production?**

---

## The Solution

```text
Natural Language Request
          ↓
   DataHub Context
          ↓
    LLM Planning
          ↓
 Risk + Impact Analysis
          ↓
 Platform-aware SQL
          ↓
    Approval Gate
          ↓
      GitHub PR
          ↓
   DataHub Writeback
```

LineageGuard is a **governance agent**, not just an SQL generator.

---

## Why LineageGuard Is Different

**The LLM understands what the user wants. LineageGuard determines how that change should safely proceed.**

### Hybrid Architecture

* **LLM** → understands natural-language intent and creates a structured execution plan
* **DataHub** → provides real metadata, schema, ownership, lineage, and governance context
* **Governance engines** → evaluate risk and impact
* **SQL generator** → produces platform-aware migrations
* **Approval engine** → determines whether manual approval is required
* **GitHub** → provides an auditable delivery mechanism
* **DataHub writeback** → records governance metadata

---

## Example

👉 See the complete example: [`examples/README.md`](examples/README.md)

```text
examples/
├── README.md
├── architecture.txt
├── request.json
├── response.json
├── migration.sql
├── rollback.sql
└── CHANGE_REPORT.md
```

The example demonstrates one complete LineageGuard workflow from a natural-language request to generated migration, governance analysis, approval, and GitHub delivery.

---

## Architecture

```
                    LINEAGEGUARD

    User Request
         │
         ▼
    DataHub Context        ← DataHub + MCP
         │
         ▼
     LLM Planning          ← Grok LLM
         │
         ▼
   Risk + Impact          ← Governance Engine
     Analysis
         │
         ▼
   SQL Generation         ← Platform-aware SQL
         │
         ▼
   Approval Gate          ← Risk-based Rules
         │
         ▼
     GitHub PR            ← GitHub API
         │
         ▼
  DataHub Writeback      ← Metadata Updates
```

For the complete technical architecture, pipeline stages, engines, state management, MCP integration, and implementation details, see [`agent/README.md`](agent/README.md).

---

## Core Workflow

### 1. Context
Retrieves real dataset metadata from DataHub through MCP.

### 2. Planning
Uses the LLM to understand the requested change and produce a structured execution plan.

### 3. Risk
Evaluates governance and technical risk.

### 4. Generation
Creates and validates a platform-aware migration and rollback.

### 5. Impact
Determines affected downstream assets and governance implications.

### 6. Approval
Automatically approves eligible low-risk changes or requires manual approval.

### 7. GitHub
Creates an auditable branch, commit, and pull request when the change is approved.

---

## Key Features

* Natural-language schema change requests
* DataHub context through MCP
* LLM-based structured planning
* Deterministic risk assessment
* Downstream impact analysis
* Platform-aware SQL generation
* SQL validation
* Automatic/manual approval gates
* Rollback generation
* DataHub governance writeback
* GitHub PR automation
* Idempotency and auditability

---

## Tech Stack

| Component       | Technology           |
| --------------- | -------------------- |
| Runtime         | Node.js / TypeScript |
| AI              | Grok                 |
| Metadata        | DataHub              |
| Integration     | MCP                  |
| Database        | PostgreSQL / Prisma  |
| Version Control | GitHub / Octokit     |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Adity-star/lineageguard.git
cd lineageguard

# Configure environment
cp .env.example .env
# Edit .env with your DataHub, GitHub, and database credentials

# Start with Docker Compose
docker compose up

# Or run the agent directly
cd agent
npm install
npm run dev
```

For detailed configuration, see [`.env.example`](.env.example).

---

## Documentation

### Documentation

* **[Agent Architecture & Technical Documentation](agent/README.md)**
  Complete architecture, pipeline stages, engines, state management, MCP integration, services, and implementation details.

* **[Working Example](examples/README.md)**
  Judge-friendly end-to-end demonstration.

---

## For Judges

If you have limited time:

```text
1. Read this README
        ↓
2. Open examples/README.md
        ↓
3. View examples/architecture.txt
        ↓
4. Inspect examples/response.json
        ↓
5. Inspect examples/migration.sql
        ↓
6. Inspect examples/CHANGE_REPORT.md
        ↓
7. Open the generated GitHub PR if available
```

This path demonstrates the complete idea without requiring understanding of the entire codebase.

---

## License

ISC