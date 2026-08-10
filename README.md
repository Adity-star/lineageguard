# LineageGuard

## AI-Powered Schema Change Governance Agent

LineageGuard turns natural-language database change requests into **context-aware, risk-assessed, auditable engineering changes**.

It uses real DataHub metadata to understand schema, lineage, ownership, tags, documentation, and downstream dependencies before generating a platform-aware migration, requesting approval, creating a GitHub pull request, and recording the governance result back in DataHub.

> **Most AI tools answer: “What SQL should I write?”**  
> **LineageGuard answers: “Should this change happen, what could it break, and how should it safely reach production?”**

[Watch the demo](https://www.youtube.com/watch?v=gbcmYlucM2Y) · [View the example](examples/README.md) · [Technical architecture](examples/architecture/technical_architecture.png)

---

## The problem

Database changes are easy to request but difficult to govern.

A request such as:

```text
Add Customerbalance to users
```

may affect:

- Downstream datasets.
- Dashboards and reports.
- SQL queries.
- dbt models and pipelines.
- Data quality checks.
- Governed or certified assets.
- Production systems.

A language model can generate SQL, but SQL generation alone does not answer:

- What is the actual dataset and current schema?
- Who owns the asset?
- What depends on it?
- How risky is the change?
- Does it require human approval?
- Which SQL syntax matches the database platform?
- Can the change be rolled back?
- Can the change be reviewed as a GitHub pull request?
- Can the decision be recorded for future users and agents?

LineageGuard addresses these questions in one governed workflow.

---

## What LineageGuard does

```text
Natural-language request
          ↓
DataHub context through MCP
          ↓
Structured LLM planning
          ↓
Deterministic risk assessment
          ↓
Platform-aware migration generation
          ↓
Downstream impact analysis
          ↓
Risk-based approval gate
          ↓
GitHub pull request
          ↓
DataHub governance write-back
```

LineageGuard is a **governance agent**, not just an SQL generator.

It can determine that a change should be:

- Automatically approved when it is low risk.
- Held for human approval.
- Rejected or blocked because required information is missing or downstream impact is too high.

---

## Why it is different

LineageGuard combines AI reasoning with deterministic controls:

| Responsibility | Implementation |
|---|---|
| Understand the request | LLM planning |
| Retrieve trusted context | DataHub MCP |
| Calculate risk | Deterministic governance engine |
| Analyze dependencies | DataHub lineage and related assets |
| Generate migrations | Platform-aware deterministic SQL generator |
| Validate changes | SQL and artifact validation |
| Control execution | Risk-based approval gate |
| Deliver safely | GitHub branch, commit, and pull request |
| Preserve governance context | DataHub write-back |
| Prevent duplicates | Database-backed idempotency |
| Support investigation | Audit logs and structured run state |

The LLM does not directly execute SQL, modify GitHub, or decide the final approval outcome. It interprets intent and produces a structured plan that is validated by deterministic engines.

---

## Example workflow

The complete example is available in [`examples/README.md`](examples/README.md).

```text
examples/
├── README.md
├── architecture/
├── test_1_low_risk/
│   ├── request.json
│   ├── response.json
│   ├── migration.sql
│   ├── ROLLBACK.sql
│   └── DOCUMENTATION.md
├── test_2_high_risk/
│   ├── request_2.json
│   └── response_2.json
└── test_3_hybrid/
    ├── request_3.json
    └── response_3.json
```

The example demonstrates:

1. A natural-language schema change request.
2. Context retrieval from DataHub through MCP.
3. Structured execution planning.
4. Deterministic risk assessment.
5. Downstream impact analysis.
6. Platform-aware migration generation.
7. Rollback generation.
8. Approval evaluation.
9. GitHub PR preparation or creation.
10. DataHub governance write-back.

---

## Architecture

```text
                         LINEAGEGUARD

 User request / CLI / API
            │
            ▼
   Context Engine
            │
            │ DataHub MCP
            ▼
     DataHub metadata
 schema · lineage · owners · tags · docs · usage
            │
            ▼
    Planning Engine
      LLM intent extraction
            │
            ▼
     Risk Engine
 deterministic risk and policy rules
            │
            ▼
   Generator Engine
 platform-aware SQL and rollback
            │
            ▼
    Impact Engine
 downstream assets and recommendations
            │
            ▼
    Approval Engine
   auto-approve / pending / reject
            │
            ▼
     GitHub Engine
 branch · commit · pull request
            │
            ▼
    DataHub Write-back
 durable governance metadata
```

For the complete technical design, see [`agent/README.md`](agent/README.md).

---

## Core workflow

### 1. Context

Retrieves dataset metadata from DataHub through MCP, including:

- Dataset identity and platform.
- Schema fields and types.
- Ownership.
- Tags and glossary terms.
- Domains and structured properties.
- Upstream and downstream lineage.
- Related dashboards, pipelines, queries, and dbt models.
- Documentation, usage, quality, certification, and deprecation metadata.

### 2. Planning

The LLM interprets the natural-language request and produces a validated execution plan containing:

- Intended operation.
- Affected dataset and columns.
- Required changes.
- Target platform.
- Missing information.
- Assumptions.
- Confidence.
- Initial approval requirement.

### 3. Risk assessment

A deterministic risk engine evaluates:

- Change type.
- Number of downstream assets.
- Related queries.
- Documentation gaps.
- Ownership gaps.
- Governance metadata.
- Impact severity.

### 4. Generation

LineageGuard generates and validates:

- Platform-specific DDL.
- Migration SQL.
- Rollback SQL.
- Change documentation.
- Optional dbt artifacts where configured.

### 5. Impact analysis

The impact engine identifies affected datasets, dashboards, queries, pipelines, and models, then creates a structured impact report.

### 6. Approval

Approval is risk-based:

- Low-risk changes may be automatically approved.
- Medium-risk changes require approval by default.
- High- and critical-risk changes require explicit human approval.
- Changes that fail validation or lack required information do not proceed.

### 7. GitHub delivery

For approved changes, LineageGuard creates:

- A deterministic feature branch.
- Migration files.
- Rollback files.
- Documentation.
- A pull request containing risk and impact information.
- Labels and reviewers where configured.

LineageGuard does not directly execute the production migration or merge the pull request.

### 8. DataHub write-back

The workflow records governance metadata back to DataHub, including change information, impact information, tags, descriptions, and structured properties where configured.

---

## Key features

- Natural-language schema change requests.
- Real DataHub context through MCP.
- Structured LLM planning.
- Deterministic risk assessment.
- Downstream lineage analysis.
- Platform-aware SQL generation.
- SQL and artifact validation.
- Risk-based approval gates.
- Migration and rollback generation.
- Governance documentation.
- DataHub metadata write-back.
- Automated GitHub pull requests.
- Idempotency and duplicate prevention.
- Structured logs and auditability.
- CLI and REST API entry points.
- Dependency injection for production and test environments.

---

## Technology stack

| Component | Technology |
|---|---|
| Runtime | Node.js, TypeScript |
| LLM planning | Configured LLM provider |
| Metadata platform | DataHub |
| Agent integration | Model Context Protocol |
| Application database | PostgreSQL |
| ORM | Prisma |
| Version control | GitHub API, Octokit |
| Frontend | Next.js, React, Tailwind CSS |
| Deployment | Docker, Docker Compose |
| Testing | Unit and integration tests |

Configure the actual LLM provider and model in `agent/.env.example`. Keep the provider name consistent throughout the documentation and demo.

---

## Quick start

### Docker

```bash
git clone https://github.com/Adity-star/lineageguard.git
cd lineageguard
```


The local DataHub stack may require significant Docker memory. If services repeatedly restart, increase the memory allocated to Docker or use the documented hosted DataHub environment.

### Development setup

Start DataHub:

```bash
datahub docker quickstart
```

Start PostgreSQL:

```bash
docker run --name lineageguard-postgres -e POSTGRES_PASSWORD=lineageguard -e POSTGRES_DB=lineageguard -p 5432:5432 -d postgres:latest
```

Install and configure the agent:

```bash
cd agent

cp .env.example .env
# Edit .env with your credentials.

npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Run a request through the CLI:

```bash
npm run cli request "Add column Customerbalance to SampleHdfsDataset"
```

Run a health check:

```bash
npm run cli health
```

For configuration details, see [`agent/.env.example`](agent/.env.example).

---

## Judge-friendly evaluation path

If you have limited time:

1. Read this README.
2. Open [`examples/README.md`](examples/README.md).
3. Inspect [`examples/test_1_low_risk/request.json`](examples/test_1_low_risk/request.json).
4. Inspect [`examples/test_1_low_risk/response.json`](examples/test_1_low_risk/response.json).
5. Review [`examples/test_1_low_risk/migration.sql`](examples/test_1_low_risk/migration.sql).
6. Review [`examples/test_1_low_risk/ROLLBACK.sql`](examples/test_1_low_risk/ROLLBACK.sql).
7. Review [`examples/test_1_low_risk/DOCUMENTATION.md`](examples/test_1_low_risk/DOCUMENTATION.md).
8. Open the generated GitHub pull request, if available.
9. Run the complete workflow using the Quick Start instructions.

The example folder provides a complete, judge-friendly workflow without requiring an immediate understanding of the entire codebase.

---

## Hackathon criteria

| Criterion | How LineageGuard addresses it |
|---|---|
| Meaningful DataHub use | Uses DataHub schema, lineage, ownership, tags, documentation, usage, and governance metadata through MCP, then writes assessment results back to DataHub. |
| Technical execution | Implements a multi-stage workflow with validation, rollback generation, approval gates, GitHub automation, idempotency, persistence, and structured errors. |
| Originality | Applies metadata-aware agent behavior to governed schema-change decisions and migration delivery rather than only generating SQL or answering catalog questions. |
| Real-world usefulness | Helps prevent schema changes from silently breaking downstream data assets, reports, dashboards, and pipelines. |
| Submission quality | Includes a runnable project, examples, architecture documentation, testable workflow, and a short demonstration. |
| Open-source contribution | Documentation contribution:(https://github.com/datahub-project/datahub/pull/19032)]. |

---

## Safety and limitations

- LineageGuard does not directly execute production database migrations.
- LineageGuard does not automatically merge GitHub pull requests.
- High-risk and critical changes require human approval.
- DataHub mutations must be explicitly enabled and should use scoped credentials.
- Generated SQL must still be reviewed by the responsible engineering team.
- Risk scores are deterministic indicators, not guarantees of safety.
- Impact analysis depends on the completeness and freshness of DataHub metadata.
- Some DataHub mutation operations require existing tags, domains, structured properties, or other entities.
- The demo environment may use seeded or representative metadata.

---

## Project documentation

- [Working example](examples/README.md)
- [Agent architecture and technical documentation](agent/README.md)
<<<<<<< HEAD
- [Environment configuration](agent/.env.example)
- [Demo video](ADD_DEMO_VIDEO_URL)
- [DataHub documentation contribution](ADD_DATAHUB_PR_URL)
=======
- [Environment configuration](.env.example)
- [Demo video](https://www.youtube.com/watch?v=gbcmYlucM2Y)
- [DataHub documentation contribution](https://github.com/datahub-project/datahub/pull/19032)
>>>>>>> 5d8e13fcdbf9727455d8be5e9b6e01358e2a6acc

---

## License

Apache License 2.0

See [`LICENSE`](LICENSE).
