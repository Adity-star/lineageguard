# LineageGuard Agent

AI-powered schema/data change governance agent that transforms natural-language change requests into context-aware, risk-assessed, governed change workflows.

LineageGuard uses a **hybrid architecture** that combines LLM reasoning with deterministic engines:

- **LLM (Grok)**: Understands natural language intent and creates structured execution plans
- **Deterministic Engines**: Perform risk assessment, SQL generation, impact analysis, approval logic, and GitHub execution

This is **NOT** simply an LLM generating SQL — it's a comprehensive governance system that ensures safe, traceable schema changes.

## What Problem It Solves

A developer might request: *"Add column Customerbalance to SampleHdfsDataset"*

A raw LLM could generate SQL, but that doesn't answer critical governance questions:

- What is the actual dataset and its current schema?
- Who owns it and what are its dependencies?
- What is its lineage and what downstream assets may break?
- How risky is this change?
- Does it require approval?
- What SQL is appropriate for the actual platform (Snowflake, Postgres, BigQuery, etc.)?
- Can the change be reviewed before execution?
- Can the operation be safely represented as a GitHub PR?
- Can duplicate requests be prevented?
- Can the resulting metadata be written back to DataHub?

LineageGuard addresses all these concerns through a single governed workflow.

## The Big Picture

```
User Request
    ↓
DataHub Context (via MCP)
    ↓
LLM Planning (Grok)
    ↓
Risk Assessment (Deterministic)
    ↓
SQL/Migration Generation (Platform-Aware)
    ↓
Impact Analysis (Downstream Dependencies)
    ↓
Approval Gate (Risk-Based)
    ↓
GitHub PR (If Approved)
    ↓
DataHub Writeback (Metadata Updates)
```

### Workflow Steps

1. **User Request**: Natural language description of desired schema change
2. **DataHub Context**: Agent gathers comprehensive metadata from DataHub including schema, ownership, lineage, documentation, tags, and relationships
3. **LLM Planning**: Grok LLM analyzes the request against context to understand intent, identify affected columns, and create a structured execution plan
4. **Risk Assessment**: Deterministic engine calculates risk scores based on downstream dependencies, ownership, documentation, and change type
5. **SQL Generation**: Platform-aware generator creates appropriate DDL for the actual database platform (Snowflake, Postgres, BigQuery, etc.) with rollback scripts
6. **Impact Analysis**: Engine identifies all downstream assets that may be affected (datasets, dashboards, pipelines, queries)
7. **Approval Gate**: Risk-based approval logic determines if manual approval is required or if auto-approval is appropriate
8. **GitHub PR**: If approved, creates a feature branch with migration files, documentation, and a pull request for review
9. **DataHub Writeback**: Updates DataHub metadata with change information, tags, and documentation

## Architecture Diagram

```mermaid
graph TD
    Entry["Entry Points<br/>CLI | API | Direct"] --> Container

    subgraph Container["Dependency Injection"]
        Prod["ProductionContainer"]
        Dev["DevelopmentContainer"]
    end

    Container --> Orchestrator

    subgraph Orchestrator["Orchestrator"]
        Orch["Orchestrator<br/>Workflow Coordination"]
    end

    Orchestrator --> Pipeline

    subgraph Pipeline["7-Stage Pipeline"]
        Context["Context Stage"]
        Planning["Planning Stage"]
        Risk["Risk Stage"]
        Generator["Generator Stage"]
        Impact["Impact Stage"]
        Approval["Approval Stage"]
        GitHub["GitHub Stage"]

        Context --> Planning
        Planning --> Risk
        Risk --> Generator
        Generator --> Impact
        Impact --> Approval
        Approval --> GitHub
    end

    Pipeline --> State["StateStore<br/>Data Flow"]

    subgraph External["External Integrations"]
        DataHub["DataHub via MCP<br/>mcp-server-datahub"]
        Grok["Grok LLM<br/>Planning"]
        GitHubAPI["GitHub API<br/>Octokit"]
        Postgres["PostgreSQL<br/>Prisma ORM"]
    end

    Context --> DataHub
    Planning --> Grok
    GitHub --> GitHubAPI
    Orchestrator --> Postgres

    subgraph Support["Supporting Services"]
        Idempotency["Idempotency Service"]
        Logger["Structured Logging"]
        Performance["Performance Tracker"]
        Config["Configuration"]
    end

    Orchestrator --> Idempotency
    Pipeline --> Logger
    Pipeline --> Performance
    Container --> Config
```


## Entry Points

### CLI (`src/cli.ts`)
**Purpose**: Command-line interface for submitting change requests and health checks

**Usage**:
```bash
npm run cli request "Add column Customerbalance to SampleHdfsDataset"
npm run cli health
npm run cli serve --port 3000
```

**How it works**:
- Parses command-line arguments using Commander.js
- Creates container with appropriate implementations
- Calls `orchestrator.execute()` with the change request
- Returns workflow results including GitHub PR URL if created

### API Server (`src/api/server.ts`)
**Purpose**: REST API server for HTTP-based requests

**How it works**:
- Starts Express server on configured port
- Provides endpoints for submitting change requests
- Delegates to orchestrator for workflow execution
- Returns JSON responses with workflow state

### Direct Execution (`src/index.ts`)
**Purpose**: Direct entry point for running the agent as a service

**How it works**:
- Starts API server on port 3001
- Sets up graceful shutdown handlers
- Initializes logging and error handling

## Dependency Injection / Container

### ProductionContainer
Uses real implementations for all external dependencies:
- **MCP**: Real DataHub connection via STDIO transport to `mcp-server-datahub`
- **LLM**: Real Grok client for planning
- **GitHub**: Real Octokit client for GitHub API
- **Database**: Real PostgreSQL via Prisma for persistence

### DevelopmentContainer
Uses mock implementations for testing:
- Mock MCP client with predefined responses
- Mock GitHub client that returns fake PR URLs
- Mock idempotency service that bypasses database
- Intended for development and testing only

### Why Dependency Injection?
- **Testing**: Easy to swap real implementations with mocks
- **Configuration**: Different environments get appropriate implementations
- **Separation**: Infrastructure concerns separated from business logic
- **Flexibility**: Easy to add new implementations without changing core logic

### Injected Services
- ContextEngine, PlanningEngine, RiskEngine, Generator, ImpactEngine, ApprovalEngine, GitHubEngine
- MCPClient, DataHubClient, GitHubClient
- IdempotencyService, Logger, PerformanceTracker
- All pipeline stages

## Orchestrator

The orchestrator (`orchestration/orchestrator.ts`) is the central workflow coordinator:

### Responsibilities
- **Workflow Coordination**: Manages the end-to-end execution of the 7-stage pipeline
- **Run IDs**: Generates unique identifiers for each workflow execution
- **Idempotency**: Generates and validates idempotency keys to prevent duplicate operations
- **Stage Execution**: Coordinates sequential execution of pipeline stages with error handling
- **Workflow Events**: Emits events (STARTED, COMPLETED, FAILED) for monitoring and integration
- **Error Handling**: Catches stage failures, logs detailed error information, and propagates structured errors
- **Performance Tracking**: Tracks timing for each stage and overall workflow
- **Final Result Handling**: Returns complete workflow state with all artifacts

### Failure Behavior
When a stage fails:
1. Error is caught and logged with full context (stage name, state, error details)
2. Workflow event FAILED is emitted
3. Idempotency record is marked as failed
4. Structured WorkflowError is thrown with error details
5. Pipeline execution stops immediately (fail-fast behavior)

### State Management
The orchestrator uses a StateStore that accumulates data through the pipeline:
- Each stage reads from the state
- Each stage adds its results to the state
- Final state contains all workflow artifacts

## Pipeline

The pipeline (`orchestration/pipeline.ts`) executes 7 stages sequentially with comprehensive logging and error handling.

### Stage 1: Context Stage

**Purpose**: Gather comprehensive metadata from DataHub about the target dataset

**Inputs**: 
- ChangeRequest (description, datasetUrn, requestedBy, priority, etc.)

**Processing**:
- Resolves dataset URN to actual dataset
- Collects metadata through multiple stages:
  - DatasetResolverStage: Finds the dataset
  - MetadataCollectorStage: Collects ownership, tags, glossary terms
  - SchemaCollectorStage: Retrieves schema fields
  - LineageCollectorStage: Gets upstream/downstream lineage
  - QueryCollectorStage: Collects related queries
  - DocumentationCollectorStage: Gets documentation
  - ContextNormalizerStage: Normalizes and structures the context
- Enriches with extended metadata (domain, related dashboards, pipelines, dbt models)

**Outputs**: ContextBundle containing:
- Dataset metadata (name, platform, description, owners, tags, glossary terms, domain)
- Schema (array of SchemaField with fieldPath, type, nullable, description, tags)
- Lineage (upstream and downstream nodes)
- Queries (related SQL queries)
- Documentation (title, content, lastUpdated)
- Related assets (dashboards, pipelines, dbt models)
- Structured properties, usage statistics, quality metrics, certification status, deprecation info

**External Dependencies**: DataHub via MCP (DataHubClient)

**Failure Behavior**: 
- Retries up to 3 times for each sub-stage
- Fails if dataset cannot be resolved
- Fails if critical metadata is unavailable

### Stage 2: Planning Stage

**Purpose**: Use LLM to understand natural language request and create structured execution plan

**Inputs**: 
- ChangeRequest
- ContextBundle (from Context stage)

**Processing**:
- PlanningEngine coordinates the planning process
- Planner builds prompts from request and context
- Prompts are sanitized to prevent injection attacks
- LLM (Grok) generates raw response
- PlanningParser parses the response into structured format
- PlanningValidator validates the parsed plan

**Outputs**: PlanningResult containing:
- ExecutionPlan with:
  - intent (summary of the change)
  - affectedColumns (list of column names)
  - requiredChanges (array of change objects with type, description)
  - platform (target database platform)
  - confidence (0-1 score)
  - requiresApproval (boolean)
  - missingInformation (array of missing details)
  - assumptions (array of assumptions made)

**External Dependencies**: Grok LLM via GrokClient

**Failure Behavior**:
- Fails if LLM request fails
- Fails if parsing fails
- Fails if validation fails

### Stage 3: Risk Stage

**Purpose**: Assess the risk of the proposed change using deterministic rules

**Inputs**:
- ExecutionPlan (from Planning stage)
- ContextBundle (from Context stage)

**Processing**:
- RiskCalculator calculates metrics:
  - downstreamDatasets (count of downstream dependencies)
  - queryCount (number of related queries)
  - hasDocumentation (boolean)
  - hasOwner (boolean)
  - requiresApproval (based on change type and impact)
- RiskScorer converts metrics to risk score (0-100) and level (LOW/MEDIUM/HIGH/CRITICAL)
- Findings are generated for:
  - Lineage impact (downstream datasets)
  - Documentation gaps
  - Governance issues (missing owners)
- Recommendations are generated based on risk level

**Outputs**: RiskAssessment containing:
- overallRisk (LOW/MEDIUM/HIGH/CRITICAL)
- score (0-100)
- affectedAssets (datasets, dashboards, queries counts)
- findings (array of severity, category, message)
- recommendations (array of recommendation titles)
- requiresApproval (boolean)

**External Dependencies**: None (deterministic)

**Failure Behavior**:
- Fails if risk calculation fails
- Fails if validation fails

### Stage 4: Generator Stage

**Purpose**: Generate platform-specific SQL DDL, rollback scripts, and documentation

**Inputs**:
- ContextBundle (from Context stage)
- ExecutionPlan (from Planning stage)
- RiskAssessment (from Risk stage)

**Processing**:
- PlatformAwareSQLGenerator generates platform-specific DDL:
  - Detects platform from plan or context (Snowflake, Postgres, BigQuery, MySQL, Redshift, Hive, etc.)
  - Resolves HDFS to Hive SQL
  - Determines operation type from plan (add_column, drop_column, rename_column, create_table, etc.)
  - Generates appropriate DDL syntax for the platform
  - Validates DDL using SQL parser
- SQLGenerator creates SQL artifact from DDL
- RollbackGenerator creates rollback statements
- DocumentationGenerator creates change documentation
- DbtGenerator creates dbt artifacts if applicable
- GenerationValidator validates all artifacts

**Outputs**: GenerationResult containing:
- ddl (DDLArtifact with platform, tableName, fieldCount, ddl statement, validation status)
- sql (SQLArtifact with sql statement, platform)
- rollback (RollbackArtifact with sql statement)
- documentation (DocumentationArtifact with markdown content)
- dbt (DbtArtifact with models, tests, etc.)
- validation status for each artifact

**External Dependencies**: None (deterministic)

**Failure Behavior**:
- Fails if platform cannot be determined
- Fails if DDL generation fails
- Fails if validation fails

### Stage 5: Impact Stage

**Purpose**: Analyze downstream impact and write metadata to DataHub

**Inputs**:
- ContextBundle (from Context stage)
- ExecutionPlan (from Planning stage)
- RiskAssessment (from Risk stage)

**Processing**:
- ImpactScorer calculates impact score and level
- RecommendationEngine generates impact recommendations
- ReportBuilder builds comprehensive impact report
- ImpactValidator validates the report
- MetadataWriter writes impact metadata to DataHub (if mutations enabled)

**Outputs**: ImpactReport containing:
- summary (description of impact)
- score (0-100)
- level (LOW/MEDIUM/HIGH/CRITICAL)
- requiresApproval (boolean)
- affectedColumns (array of column details)
- affectedAssets (array of affected assets with type, urn, name)
- recommendations (array of recommendations)
- triggeredRules (array of rule triggers)
- metadata (additional impact metadata)

**External Dependencies**: DataHub via MCP (for writeback)

**Failure Behavior**:
- Fails if impact calculation fails
- Continues if DataHub writeback fails (logged but doesn't fail the stage)

### Stage 6: Approval Stage

**Purpose**: Evaluate approval requirements and process approval decision

**Inputs**:
- RiskAssessment (from Risk stage)
- ImpactReport (from Impact stage)

**Processing**:
- ApprovalEngine.requiresApproval() determines if manual approval is needed:
  - HIGH/CRITICAL risk or impact always requires approval
  - MEDIUM risk or impact requires approval by default
  - LOW risk can be auto-approved
- If auto-approve is enabled or not required:
  - Creates APPROVED decision with auto-approval reason
- If manual approval required:
  - Creates PENDING decision with "Awaiting manual approval" reason
- ApprovalValidator validates the decision

**Outputs**: ApprovalDecision containing:
- status (APPROVED/PENDING/REJECTED)
- reviewedBy (who made the decision)
- reviewedAt (timestamp of decision)
- reason (explanation for the decision)

**External Dependencies**: None (deterministic)

**Failure Behavior**:
- Fails if approval processing fails
- Fails if validation fails

### Stage 7: GitHub Stage

**Purpose**: Create GitHub pull request if change is approved

**Inputs**:
- ApprovalDecision (from Approval stage)
- ContextBundle (from Context stage)
- ExecutionPlan (from Planning stage)
- GenerationResult (from Generator stage)
- ImpactReport (from Impact stage)

**Processing**:
- Checks if approval status is APPROVED
- If not approved, skips GitHub PR creation
- Generates deterministic branch name based on:
  - change type
  - dataset name
  - affected columns
  - hash for uniqueness
- Generates idempotency key for GitHub PR creation
- Checks if branch already exists
- Creates feature branch if it doesn't exist
- Commits generated files:
  - migration.sql (DDL)
  - DOCUMENTATION.md (change documentation)
  - ROLLBACK.sql (rollback script)
- Verifies branch exists before PR creation
- Checks if PR already exists
- Builds pull request with:
  - Title, description, labels, reviewers
- Validates pull request
- Creates pull request via GitHub API
- Adds labels and reviewers

**Outputs**: GitHubResult containing:
- number (PR number)
- url (PR URL)
- branch (feature branch name)

**External Dependencies**: GitHub API via Octokit

**Failure Behavior**:
- Skipped if not approved
- Retries GitHub operations with exponential backoff
- Fails if branch creation fails
- Fails if file commits fail
- Fails if PR creation fails

## Context Stage Details

The ContextEngine (`context/context-engine.ts`) orchestrates a multi-stage context gathering pipeline from DataHub.

### Metadata Collected

The ContextBundle contains comprehensive metadata:

**Dataset Metadata**:
- Basic info: urn, name, platform, description
- Ownership: owners array with urn, name, type
- Tags: array of tag strings
- Glossary terms: array with urn, name, description
- Domain: urn, name, description
- Structured properties: key-value pairs
- Quality: passedChecks, failedChecks
- Certification: certified boolean
- Deprecation: deprecated, note, decommissionDate

**Schema**:
- Array of SchemaField objects:
  - fieldPath (column name)
  - type (data type)
  - nullable (boolean)
  - description (optional)
  - tags (array of strings)

**Lineage**:
- Upstream: array of LineageNode (urn, name, entityType)
- Downstream: array of LineageNode (urn, name, entityType)

**Queries**:
- Array of DatasetQuery objects:
  - id (query identifier)
  - sql (SQL text)
  - lastSeen (timestamp)

**Documentation**:
- Array of Document objects:
  - id (document identifier)
  - title (document title)
  - snippet (content snippet)
  - url (document URL)

**Related Assets**:
- Related dashboards: array of dashboard references
- Related pipelines: array of pipeline references
- Related dbt models: array of dbt model references

**Usage Statistics**:
- queryCount: number of related queries

### Context Enrichment

After base context collection, the engine enriches with extended metadata via parallel DataHub calls:
- getOwners(), getGlossaryTerms(), getTags()
- getStructuredProperties(), getDomain()
- getRelatedDashboards(), getRelatedPipelines(), getRelatedDbtModels()

### Caching

The ContextEngine implements a 5-minute TTL cache to avoid redundant DataHub calls for the same dataset.

### Example ContextBundle

```typescript
{
  dataset: {
    urn: "urn:li:dataset:(urn:li:dataPlatform:hdfs,SampleHdfsDataset,PROD)",
    name: "SampleHdfsDataset",
    platform: "hdfs",
    description: "Sample HDFS dataset",
    owners: [{ urn: "urn:li:corpuser:user1", name: "John Doe", type: "CORP_USER" }],
    tags: ["PII", "FINANCIAL"],
    glossaryTerms: [],
    domain: { urn: "urn:li:domain:finance", name: "Finance" },
    quality: { passedChecks: 5, failedChecks: 0 },
    certification: { certified: true },
    deprecation: { deprecated: false }
  },
  schema: [
    {
      fieldPath: "customer_id",
      type: "bigint",
      nullable: false,
      description: "Customer identifier",
      tags: ["PK"]
    },
    {
      fieldPath: "customer_name",
      type: "varchar",
      nullable: false,
      description: "Customer name"
    }
  ],
  lineage: {
    upstream: [
      { urn: "urn:li:dataset:(...)", name: "RawCustomers", entityType: "dataset" }
    ],
    downstream: [
      { urn: "urn:li:dataset:(...)", name: "CustomerAnalytics", entityType: "dataset" },
      { urn: "urn:li:dashboard:(...)", name: "CustomerDashboard", entityType: "dashboard" }
    ]
  },
  queries: [
    { id: "query1", sql: "SELECT * FROM SampleHdfsDataset", lastSeen: "2026-08-09T00:00:00Z" }
  ],
  documentation: [
    { id: "doc1", title: "Dataset Documentation", snippet: "This dataset contains..." }
  ],
  relatedDashboards: [],
  relatedPipelines: [],
  relatedDbtModels: [],
  provenance: {
    datasetUrn: "urn:li:dataset:(...)",
    retrievedAt: "2026-08-09T12:00:00Z",
    source: "datahub",
    retrievalDurationMs: 1250
  }
}
```

## Planning Stage — LLM Role

The Planning Stage uses the LLM specifically for **semantic understanding and intent extraction**, not for direct execution.

### What the LLM Does

The LLM (Grok via GrokClient) performs these tasks:

1. **Interprets Natural Language**: Understands the user's intent from the description
2. **Identifies Operation Type**: Determines if it's add_column, drop_column, rename_column, etc.
3. **Identifies Affected Assets**: Maps the request to specific columns and datasets
4. **Creates ExecutionPlan**: Structures the understanding into a standardized format
5. **Identifies Missing Information**: Flags what information is needed (e.g., data type for new column)
6. **Documents Assumptions**: Records assumptions made during interpretation
7. **Provides Confidence Score**: Indicates how confident the LLM is in its understanding
8. **Determines Required Changes**: Lists the specific changes needed

### Example

**Input**:
```
Description: "Add column Customerbalance_9 to SampleHdfsDataset"
```

**Output (conceptually)**:
```json
{
  "intent": "Add a new column Customerbalance_9 to SampleHdfsDataset",
  "affectedColumns": ["Customerbalance_9"],
  "requiredChanges": [
    {
      "type": "add_column",
      "description": "Add column Customerbalance_9 to SampleHdfsDataset",
      "columnName": "Customerbalance_9",
      "tableName": "SampleHdfsDataset"
    }
  ],
  "missingInformation": ["dataType"],
  "assumptions": [
    "Column should be nullable",
    "Column should be added at the end of the table"
  ],
  "confidence": 0.95,
  "platform": "hdfs",
  "requiresApproval": true
}
```

### Important Constraints

- The LLM **does not** execute the change
- The LLM **does not** generate SQL directly
- The LLM **does not** interact with GitHub
- The LLM output is **validated** by deterministic parsers
- The LLM prompts are **sanitized** to prevent injection attacks

## Hybrid AI + Deterministic Architecture

LineageGuard uses a hybrid approach that leverages the strengths of both AI and deterministic systems.

### Why Hybrid?

**LLM Strengths**:
- Semantic understanding of natural language
- Intent extraction from ambiguous requests
- Handling edge cases and novel situations
- Context-aware reasoning
- Flexible interpretation

**LLM Weaknesses**:
- Non-deterministic outputs
- Can hallucinate or make errors
- Difficult to validate consistently
- Security concerns with prompt injection
- Limited precision for technical tasks

**Deterministic Engine Strengths**:
- Consistent, repeatable behavior
- Precise control over output format
- Easy to test and validate
- Security and reliability
- Performance predictability

**Deterministic Engine Weaknesses**:
- Rigid, requires explicit rules
- Poor at handling ambiguity
- Limited semantic understanding
- Complex to maintain for edge cases

### Responsibility Division

| Responsibility | LLM | Deterministic Engine |
|----------------|-----|---------------------|
| Natural language understanding | ✅ | ❌ |
| Intent extraction | ✅ | ❌ |
| Semantic reasoning | ✅ | ❌ |
| Handling ambiguity | ✅ | ❌ |
| Risk scoring | ❌ | ✅ |
| SQL generation | ❌ | ✅ |
| Platform-specific syntax | ❌ | ✅ |
| Impact calculation | ❌ | ✅ |
| Approval logic | ❌ | ✅ |
| GitHub operations | ❌ | ✅ |
| Idempotency | ❌ | ✅ |
| Metadata validation | ❌ | ✅ |
| DataHub mutations | ❌ | ✅ |

### Safety Benefits

This hybrid approach is safer than pure LLM because:

1. **Validation Layer**: Every LLM output is validated by deterministic parsers
2. **No Direct Execution**: LLM never directly executes changes or generates final SQL
3. **Risk Assessment**: Deterministic risk engine provides objective scoring
4. **Approval Gates**: Human approval required for high-risk changes
5. **Audit Trail**: All decisions are logged and traceable
6. **Reversibility**: Rollback scripts generated deterministically
7. **Platform Awareness**: SQL generation respects platform-specific requirements

## Risk Engine

The RiskEngine (`risk/risk-engine.ts`) provides deterministic risk assessment using rule-based logic.

### Risk Calculation

RiskCalculator calculates metrics based on:
- **downstreamDatasets**: Number of downstream dependencies from lineage
- **queryCount**: Number of related queries
- **hasDocumentation**: Boolean indicating if dataset has documentation
- **hasOwner**: Boolean indicating if dataset has assigned owner
- **requiresApproval**: Based on change type and impact

### Risk Scoring

RiskScorer converts metrics to:
- **Score**: 0-100 numeric score
- **Level**: LOW (0-25), MEDIUM (26-50), HIGH (51-75), CRITICAL (76-100)

### Findings Generation

Findings are generated for:
- **LINEAGE**: Downstream dataset impact (HIGH if >10, MEDIUM otherwise)
- **DOCUMENTATION**: Missing documentation (LOW severity)
- **GOVERNANCE**: Missing owner (MEDIUM severity)

### Approval Requirement

Changes require approval if:
- Risk engine requires approval (based on change type)
- Risk level is MEDIUM, HIGH, or CRITICAL
- Impact level is MEDIUM, HIGH, or CRITICAL

### Example RiskAssessment

```json
{
  "overallRisk": "MEDIUM",
  "score": 45,
  "affectedAssets": {
    "datasets": 3,
    "dashboards": 0,
    "queries": 5
  },
  "findings": [
    {
      "severity": "MEDIUM",
      "category": "LINEAGE",
      "message": "3 downstream dataset(s) may be affected."
    },
    {
      "severity": "LOW",
      "category": "DOCUMENTATION",
      "message": "Dataset has no documentation."
    }
  ],
  "recommendations": [
    "Review downstream dependencies",
    "Add documentation to dataset",
    "Consider change during maintenance window"
  ],
  "requiresApproval": true
}
```

## Generator Engine

The Generator (`generators/generator.ts`) orchestrates platform-aware SQL generation and artifact creation.

### Generation Process

1. **Platform-Aware DDL Generation**: PlatformAwareSQLGenerator creates platform-specific DDL
2. **SQL Artifact**: SQLGenerator wraps DDL in SQL artifact
3. **Rollback Generation**: RollbackGenerator creates rollback statements
4. **Documentation**: DocumentationGenerator creates change documentation
5. **dbt Artifacts**: DbtGenerator creates dbt models and tests
6. **Validation**: GenerationValidator validates all artifacts

### Platform-Aware SQL Generation

PlatformAwareSQLGenerator (`generators/platform-aware-sql-generator.ts`) handles:

**Platform Detection**:
- Extracts platform from plan or context
- Resolves HDFS to Hive SQL
- Supports: Snowflake, Postgres, BigQuery, MySQL, Redshift, Hive, T-SQL

**Operation Types**:
- add_column: Adds new column to existing table
- drop_column: Removes column from table
- rename_column: Renames existing column
- modify_column: Changes column definition
- create_table: Creates new table
- drop_table: Drops existing table

**Type Mapping**:
- Maps generic types to platform-specific types
- Handles nullable/not-null constraints
- Respects platform-specific syntax

**Validation**:
- SQLValidator parses generated DDL
- Checks for syntax errors
- Marks validation status in artifact

### Example Generation

**Request**: "Add column Customerbalance_9 to SampleHdfsDataset"

**Generated DDL** (Hive/HDFS):
```sql
ALTER TABLE SampleHdfsDataset
ADD COLUMN Customerbalance_9 STRING;
```

**Generated Rollback**:
```sql
ALTER TABLE SampleHdfsDataset
DROP COLUMN Customerbalance_9;
```

**Generated Documentation**:
```markdown
# Schema Change: Add Column Customerbalance_9

## Summary
Added column Customerbalance_9 to SampleHdfsDataset

## Risk Assessment
- Risk Level: MEDIUM
- Risk Score: 45
- Requires Approval: Yes

## Impact
- Affected Datasets: 3
- Affected Queries: 5

## Rollback
Use ROLLBACK.sql to revert this change.
```

## SQL Validation

SQL validation is performed by SQLValidator (`generators/sql-validator.ts`):

**Validation Process**:
- Parses generated SQL using SQL parser
- Checks for syntax errors
- Validates platform-specific syntax
- Returns validation status and any errors/warnings

**Validation States**:
- VALID: SQL passes all checks
- INVALID: SQL has syntax errors
- WARNING: SQL has warnings but is valid

**Why Separate?**
- Generation creates the SQL
- Validation ensures correctness
- Separation allows for different validation strategies
- Enables feedback loops for fixing issues

## Impact Engine

The ImpactEngine (`impact/impact-engine.ts`) analyzes downstream impact and writes metadata to DataHub.

### Impact Calculation

ImpactScorer calculates:
- **Score**: 0-100 based on affected assets and risk
- **Level**: LOW/MEDIUM/HIGH/CRITICAL
- **Affected Assets**: Datasets, dashboards, queries, pipelines

### Affected Assets

Impact analysis identifies:
- **Datasets**: Downstream datasets from lineage
- **Dashboards**: Dashboards that query the dataset
- **Queries**: SQL queries that reference the dataset
- **Pipelines**: Data pipelines that depend on the dataset
- **dbt Models**: dbt models that use the dataset

### DataHub Writeback

MetadataWriter (`impact/metadata-writer.js`) writes impact metadata to DataHub via MCP:

**Writeback Operations** (if TOOLS_IS_MUTATION_ENABLED=true):
- Update dataset descriptions with impact information
- Add governance tags
- Update structured properties with impact scores
- Write impact reports to dataset documentation

**Safety**:
- Writeback failures are logged but don't fail the stage
- Mutations are validated before execution
- Entity URNs are validated

## Approval Engine

The ApprovalEngine (`approval/approval-engine.ts`) manages the approval gate.

### Approval Logic

**requiresApproval()** determines if manual approval is needed:

```typescript
// HIGH/CRITICAL always require approval
if (risk.overallRisk === "HIGH" || risk.overallRisk === "CRITICAL") return true;
if (impact.level === "HIGH" || impact.level === "CRITICAL") return true;

// MEDIUM requires approval by default
if (risk.overallRisk === "MEDIUM" || impact.level === "MEDIUM") return true;

// LOW can be auto-approved
return false;
```

### Approval Decisions

**Auto-Approval**:
- Status: APPROVED
- Reason: "Auto-approved: Low risk change" or "Auto-approved: Testing mode"
- ReviewedBy: "LineageGuard"

**Manual Approval**:
- Status: PENDING
- Reason: "Awaiting manual approval"
- ReviewedBy: "LineageGuard"

**Manual Decision**:
- Status: APPROVED or REJECTED
- ReviewedBy: Actual reviewer
- Reason: Decision rationale

### Validation

ApprovalValidator validates:
- APPROVED decisions must have reviewer information
- REJECTED decisions must have a reason
- HIGH/CRITICAL changes require a reason

### GitHub Execution Control

**GitHub stage only executes if**:
- Approval status is APPROVED
- All previous stages completed successfully
- Idempotency check passes (no duplicate PR)

**If not approved**:
- GitHub stage is skipped
- No PR is created
- Workflow completes without GitHub artifact

## GitHub Engine

The GitHubEngine (`github/github-engine.ts`) converts approved changes into GitHub workflows.

### Branch Naming

Branch names are generated deterministically based on:
- Change type (add_column, drop_column, etc.)
- Dataset name
- Affected columns (sorted for consistency)
- Hash for uniqueness

**Format**: `{change_type}/{dataset_name}/{columns}` or `{change_type}/{dataset_name}/{hash}`

**Example**: `add_column/samplehdfsdataset/customerbalance_9`

### PR Creation Process

1. **Branch Creation**:
   - Check if branch already exists
   - Create feature branch from base branch
   - Handle branch conflicts gracefully

2. **File Commits**:
   - Commit migration.sql (DDL)
   - Commit DOCUMENTATION.md (change documentation)
   - Commit ROLLBACK.sql (rollback script)

3. **Branch Verification**:
   - Verify branch exists before PR creation
   - Get branch SHA for reference

4. **PR Existence Check**:
   - Check if PR already exists for this branch
   - Return existing PR if found

5. **PR Creation**:
   - Build PR with title, description, labels, reviewers
   - Validate PR structure
   - Create PR via GitHub API
   - Add labels and reviewers

6. **Idempotency**:
   - Use change-specific idempotency key
   - Return cached PR if duplicate request
   - Log idempotency hits

### Idempotency Key

GitHub PR idempotency key includes:
- Repository (owner/repo)
- Base branch
- Dataset URN
- Change type
- Affected columns (sorted)
- Change description

### When Not Approved

If approval status is not APPROVED:
- GitHub stage logs skip message
- No branch is created
- No files are committed
- No PR is created
- Workflow completes without GitHub artifact

## DataHub MCP Integration

LineageGuard uses the Model Context Protocol (MCP) to integrate with DataHub.

### Architecture

```
LineageGuard Agent
    ↓
MCP Client (mcp/client.ts)
    ↓
StdioMCPTransport (mcp/studio-transport.ts)
    ↓
mcp-server-datahub (subprocess)
    ↓
DataHub GraphQL/GMS API
    ↓
DataHub Metadata
```

### Transport

**StdioMCPTransport**:
- Launches `mcp-server-datahub` as a subprocess
- Communicates via stdin/stdout
- Passes environment variables for DataHub configuration
- Avoids HTTP overhead and connection management

### DataHub Client

DataHubClient (`mcp/datahub-client.ts`) provides typed methods for DataHub operations:

**Read Tools**:
- `searchDatasets()`: Search for datasets by query
- `getDataset()`: Get dataset metadata
- `getOwners()`: Get dataset owners
- `getGlossaryTerms()`: Get glossary terms
- `getTags()`: Get dataset tags
- `getStructuredProperties()`: Get structured properties
- `getDomain()`: Get domain information
- `getSchema()`: Get dataset schema
- `getLineage()`: Get upstream/downstream lineage
- `getQueries()`: Get related queries
- `getDocuments()`: Get documentation
- `getRelatedDashboards()`: Get related dashboards
- `getRelatedPipelines()`: Get related pipelines
- `getRelatedDbtModels()`: Get related dbt models

**Mutation Tools** (if TOOLS_IS_MUTATION_ENABLED=true):
- `updateDescription()`: Update dataset description
- `addTags()`: Add tags to dataset
- `removeTags()`: Remove tags from dataset
- `addOwners()`: Add owners to dataset
- `removeOwners()`: Remove owners from dataset
- `addTerms()`: Add glossary terms
- `removeTerms()`: Remove glossary terms
- `addStructuredProperties()`: Add structured properties
- `removeStructuredProperties()`: Remove structured properties
- `setDomain()`: Set dataset domain
- `removeDomain()`: Remove dataset domain

### Tool Response Validation

All tool responses are validated:
- Response structure is checked
- Required fields are validated
- Errors are caught and logged
- Validation failures propagate as errors

## DataHub Mutation Safety

Metadata mutations to DataHub are handled with safety measures:

### Entity URN Validation
- All entity URNs are validated before mutations
- URN format is checked
- Entity existence is verified where possible

### Tag URN Handling
- Tag URNs must follow DataHub format
- Tags are resolved to actual DataHub tag entities
- Non-existent tags are handled gracefully

### Structured Properties
- Property values are validated against schema
- Property names are checked for validity
- Type safety is enforced

### Validation
- All mutations are validated before execution
- Mutation failures are logged with full context
- Failed mutations don't fail the entire workflow

### Writeback Behavior
- Writeback is controlled by TOOLS_IS_MUTATION_ENABLED
- When disabled, mutations are skipped
- When enabled, mutations are attempted with error handling
- Writeback failures are logged but don't fail the stage

### Limitations
- Some metadata mutations require pre-existing DataHub entities
- Structured properties require schema definitions in DataHub
- Tag mutations require tag URNs to exist in DataHub
- Domain mutations require domain entities to exist

## State Management

StateStore (`orchestration/state.ts`) manages the accumulated workflow state.

### State Structure

The workflow state accumulates through the pipeline:

```typescript
interface WorkflowState {
  request?: ChangeRequest;           // Original user request
  context?: ContextBundle;          // DataHub context from Context stage
  plan?: ExecutionPlan;             // LLM-generated plan from Planning stage
  risk?: RiskAssessment;            // Risk assessment from Risk stage
  generation?: GenerationResult;    // Generated artifacts from Generator stage
  impact?: ImpactReport;            // Impact analysis from Impact stage
  approval?: ApprovalDecision;      // Approval decision from Approval stage
  github?: GitHubResult;            // GitHub PR from GitHub stage
  performance?: PerformanceMetrics;  // Timing metrics
  runId?: string;                   // Unique run identifier
}
```

### State Flow

1. **Initial State**: Contains only the ChangeRequest and runId
2. **After Context**: Adds ContextBundle with DataHub metadata
3. **After Planning**: Adds ExecutionPlan with LLM interpretation
4. **After Risk**: Adds RiskAssessment with risk analysis
5. **After Generation**: Adds GenerationResult with SQL and artifacts
6. **After Impact**: Adds ImpactReport with downstream impact
7. **After Approval**: Adds ApprovalDecision with approval status
8. **After GitHub**: Adds GitHubResult with PR information (if approved)

### State Immutability

StateStore provides immutable state management:
- State is never mutated directly
- Each stage adds new state via `state.set()`
- Previous state remains unchanged
- Enables debugging and audit trails

## Idempotency

IdempotencyService (`utils/idempotency.ts`) prevents duplicate operations using database-backed tracking.

### Why Idempotency Matters

Duplicate schema changes are dangerous:
- Can cause data corruption
- Can break downstream systems
- Can create inconsistent state
- Can waste resources
- Can cause confusion in audit trails

### Idempotency Keys

Keys are generated from operation inputs:
- For workflow: description, datasetUrn, requestedBy, priority
- For context: description, datasetUrn, context hash
- For planning: description, datasetUrn, context hash
- For risk: plan actions, context dataset URN
- For generation: plan actions, risk level, risk score
- For GitHub PR: repository, branch, dataset, change type, columns

### Database-Backed Tracking

Idempotency records are stored in PostgreSQL via Prisma:

**Schema**:
```prisma
model IdempotencyRecord {
  id            String   @id @default(cuid())
  operationType String
  tenantId      String   @default("default")
  key           String
  status        IdempotencyStatus @default(PENDING)
  result        Json?
  expiresAt     DateTime
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([operationType, tenantId, key])
}
```

**Status Values**:
- PENDING: Operation is currently running
- COMPLETED: Operation completed successfully
- FAILED: Operation failed

### Operation Flow

1. **Check**: Query database for existing record
2. **Expired**: Delete if record is expired
3. **Stale PENDING**: Release if PENDING record is too old (crashed worker)
4. **Claim**: Insert new PENDING record if clean
5. **Duplicate Return**: Return cached result if COMPLETED
6. **Record**: Update with result when operation completes

### Example

**First Request**:
```typescript
const result = await withIdempotency(
  { key: "add_column_customerbalance", operationType: "generation" },
  async () => {
    return await generator.generate(context, plan, risk);
  },
  idempotencyService
);
// Executes generation, caches result
```

**Duplicate Request**:
```typescript
const result = await withIdempotency(
  { key: "add_column_customerbalance", operationType: "generation" },
  async () => {
    return await generator.generate(context, plan, risk);
  },
  idempotencyService
);
// Returns cached result, skips generation
```

### TTL Configuration

Default TTLs per operation type:
- Workflow execution: 24 hours
- Context build: 1 hour
- Planning: 6 hours
- Risk assessment: 6 hours
- Generation: 24 hours
- Impact writeback: 12 hours
- Approval decision: 48 hours
- GitHub PR creation: 7 days
- Metadata writeback: 12 hours
- Change request: 24 hours

## Error Handling

LineageGuard uses structured error handling throughout the pipeline.

### Error Propagation

```
MCP Failure
    ↓
Context Stage Failure
    ↓
Pipeline Failure
    ↓
Orchestrator Catches Failure
    ↓
Idempotency Marked FAILED
    ↓
Structured Error Returned
```

### Error Types

**WorkflowError** (`orchestration/errors.ts`):
- Thrown when workflow execution fails
- Contains error context and original error
- Includes stage name and error details

**IdempotencyError** (`utils/idempotency.ts`):
- Thrown when idempotency check fails
- HTTP 409 Conflict status
- Contains duplicate operation details

**AppError** (`utils/errors.ts`):
- Base error class for application errors
- Includes error code and HTTP status
- Used for structured error responses

### Error Logging

All errors are logged with:
- Error type and message
- Stack trace (for Error objects)
- Context (runId, stage, state)
- Error categorization

### Failure Behavior

**Stage Failure**:
- Stage execution stops immediately
- Error is caught and logged
- Pipeline execution fails
- Orchestrator emits FAILED event
- Idempotency record is marked FAILED
- Structured error is returned to caller

**External Service Failure**:
- Retries with exponential backoff (where configurable)
- Logs retry attempts
- Fails after max retries
- Includes service-specific error details

**Validation Failure**:
- Fails the current stage
- Includes validation errors in response
- Provides details about what failed validation

## Observability

LineageGuard provides comprehensive observability through structured logging and metrics.

### Structured Logging

All logs use structured JSON format with:
- **event**: Event type for filtering
- **runId**: Unique workflow identifier
- **stage**: Current pipeline stage
- **durationMs**: Operation duration
- **error**: Error details (when applicable)
- **context**: Additional context fields

### Correlation IDs

- **runId**: Unique identifier for each workflow execution
- **recordId**: Idempotency record identifier
- **requestId**: Original request identifier

### Stage Timing

Each stage is timed:
- Stage start time logged
- Stage duration calculated
- Per-stage performance metrics collected
- Total workflow duration tracked

### Performance Metrics

PerformanceTracker (`utils/performance.ts`) collects:
- Stage-level timing (context, planning, risk, generation, impact, approval, github)
- Total workflow duration
- Per-operation timing (e.g., generation, validation)

### Error Categories

Errors are categorized by:
- **event type**: Specific error event
- **error type**: Error class/type
- **stage**: Pipeline stage where error occurred
- **service**: External service (if applicable)

### Example Log Flow

```json
{"event":"run_started","runId":"req_123","request":{"description":"Add column..."}}
{"event":"context_retrieval_started","datasetUrn":"urn:li:dataset:(...)"}
{"event":"context_dataset_resolved"}
{"event":"context_schema_retrieved"}
{"event":"context_lineage_retrieved"}
{"event":"planning_engine_started","dataset":"SampleHdfsDataset"}
{"event":"planning_completed","durationMs":1250}
{"event":"risk_score","overallRisk":"MEDIUM","score":45}
{"event":"generator_ddl_generated"}
{"event":"github_pr_created","prNumber":123}
{"event":"run_completed","performance":{"totalMs":5000}}
```

## Database / Persistence

LineageGuard uses PostgreSQL with Prisma ORM for persistence.

### Prisma Schema

The database schema (`prisma/schema.prisma`) includes:

**Core Entities**:
- User: User accounts and authentication
- Tenant: Multi-tenant isolation
- Membership: User-tenant relationships

**Change Requests**:
- ChangeRequest: Schema change requests submitted by users

**Workflow Execution**:
- WorkflowRun: Complete workflow runs
- ExecutionStep: Individual step execution
- WorkflowState: Complete workflow state snapshot

**Assessments**:
- RiskAssessment: Risk assessment results
- ImpactReport: Impact analysis reports

**Approval**:
- ApprovalDecision: Approval decisions

**Artifacts**:
- GeneratedArtifact: Generated SQL and documentation

**Idempotency**:
- IdempotencyRecord: Idempotency tracking

**Audit**:
- AuditLog: Audit trail for all operations

### What is Persisted

**Idempotency Records**:
- Operation type and key
- Status (PENDING, COMPLETED, FAILED)
- Cached results
- Expiration time

**Workflow State**:
- Complete workflow state snapshot
- All stage outputs
- Performance metrics
- Request and response data

**Risk Assessments**:
- Risk scores and levels
- Affected assets
- Findings and recommendations

**Impact Reports**:
- Impact scores and levels
- Affected columns and assets
- Recommendations

**Approval Decisions**:
- Approval status
- Reviewer information
- Decision reasons

**Generated Artifacts**:
- SQL DDL statements
- Rollback scripts
- Documentation

**Audit Logs**:
- All operations
- User actions
- System events

### Database Configuration

Environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- Uses Prisma with PostgreSQL adapter
- Connection pooling via Prisma

## End-to-End Example

Complete example of adding a column to a dataset.

### 1. Request

```typescript
{
  "description": "Add column Customerbalance_9 to SampleHdfsDataset",
  "datasetUrn": "urn:li:dataset:(urn:li:dataPlatform:hdfs,SampleHdfsDataset,PROD)",
  "requestedBy": "john.doe@company.com",
  "priority": "medium"
}
```

### 2. Context Retrieved from DataHub

```typescript
{
  "dataset": {
    "urn": "urn:li:dataset:(urn:li:dataPlatform:hdfs,SampleHdfsDataset,PROD)",
    "name": "SampleHdfsDataset",
    "platform": "hdfs",
    "description": "Sample HDFS dataset",
    "owners": [{"urn": "urn:li:corpuser:user1", "name": "John Doe", "type": "CORP_USER"}],
    "tags": ["PII", "FINANCIAL"]
  },
  "schema": [
    {"fieldPath": "customer_id", "type": "bigint", "nullable": false},
    {"fieldPath": "customer_name", "type": "varchar", "nullable": false}
  ],
  "lineage": {
    "downstream": [
      {"urn": "urn:li:dataset:(...)", "name": "CustomerAnalytics", "entityType": "dataset"}
    ]
  }
}
```

### 3. LLM Plan

```typescript
{
  "intent": "Add a new column Customerbalance_9 to SampleHdfsDataset",
  "affectedColumns": ["Customerbalance_9"],
  "requiredChanges": [
    {
      "type": "add_column",
      "description": "Add column Customerbalance_9",
      "columnName": "Customerbalance_9",
      "tableName": "SampleHdfsDataset"
    }
  ],
  "missingInformation": ["dataType"],
  "assumptions": ["Column should be nullable"],
  "confidence": 0.95,
  "platform": "hdfs",
  "requiresApproval": true
}
```

### 4. Risk Result

```typescript
{
  "overallRisk": "MEDIUM",
  "score": 45,
  "affectedAssets": {
    "datasets": 1,
    "dashboards": 0,
    "queries": 3
  },
  "findings": [
    {
      "severity": "MEDIUM",
      "category": "LINEAGE",
      "message": "1 downstream dataset(s) may be affected."
    }
  ],
  "requiresApproval": true
}
```

### 5. SQL Generated

```sql
-- migration.sql
ALTER TABLE SampleHdfsDataset
ADD COLUMN Customerbalance_9 STRING;
```

### 6. Rollback Generated

```sql
-- ROLLBACK.sql
ALTER TABLE SampleHdfsDataset
DROP COLUMN Customerbalance_9;
```

### 7. Impact Result

```typescript
{
  "summary": "Adding column Customerbalance_9 affects 1 downstream dataset",
  "score": 40,
  "level": "MEDIUM",
  "requiresApproval": true,
  "affectedColumns": ["Customerbalance_9"],
  "affectedAssets": [
    {"type": "DATASET", "urn": "...", "name": "CustomerAnalytics"}
  ]
}
```

### 8. Approval Decision

```typescript
{
  "status": "APPROVED",
  "reviewedBy": "LineageGuard",
  "reviewedAt": "2026-08-09T12:00:00Z",
  "reason": "Auto-approved: Testing mode"
}
```

### 9. GitHub Branch

Branch: `add_column/samplehdfsdataset/customerbalance_9`

### 10. Commit/PR

**Files Committed**:
- `migration.sql`: DDL statement
- `DOCUMENTATION.md`: Change documentation
- `ROLLBACK.sql`: Rollback script

**Pull Request**:
- Title: "Add column Customerbalance_9 to SampleHdfsDataset"
- Description: Risk and impact analysis
- Labels: ["schema-change", "medium-risk"]
- Reviewers: ["data-team"]

### 11. DataHub Writeback

If mutations enabled:
- Update dataset description with change information
- Add governance tags
- Update structured properties with impact score

### 12. Final Response

```typescript
{
  "request": { "description": "Add column Customerbalance_9..." },
  "runId": "req_1234567890_abc123",
  "context": { /* DataHub context */ },
  "plan": { /* LLM plan */ },
  "risk": { /* Risk assessment */ },
  "generation": { /* Generated artifacts */ },
  "impact": { /* Impact report */ },
  "approval": { /* Approval decision */ },
  "github": {
    "number": 123,
    "url": "https://github.com/owner/repo/pull/123",
    "branch": "add_column/samplehdfsdataset/customerbalance_9"
  },
  "performance": {
    "totalMs": 5000,
    "context": 1200,
    "planning": 1500,
    "risk": 100,
    "generation": 800,
    "impact": 600,
    "approval": 50,
    "github": 750
  }
}
```

## Final Output Structure

The API returns a complete WorkflowState:

```typescript
interface WorkflowState {
  // Original request
  request?: ChangeRequest;
  
  // DataHub context
  context?: ContextBundle;
  
  // LLM-generated plan
  plan?: ExecutionPlan;
  
  // Risk assessment
  risk?: RiskAssessment;
  
  // Generated artifacts
  generation?: GenerationResult;
  
  // Impact analysis
  impact?: ImpactReport;
  
  // Approval decision
  approval?: ApprovalDecision;
  
  // GitHub PR (if approved)
  github?: GitHubResult;
  
  // Performance metrics
  performance?: PerformanceMetrics;
  
  // Run identifier
  runId?: string;
}
```

### Key Fields

**request**: Original user request with description, datasetUrn, requestedBy, priority

**runId**: Unique identifier for this workflow execution

**context**: Complete DataHub context including dataset metadata, schema, lineage, ownership

**plan**: LLM-generated execution plan with intent, affected columns, required changes

**risk**: Risk assessment with score, level, findings, recommendations

**generation**: Generated artifacts including DDL, SQL, rollback, documentation

**impact**: Impact analysis with affected assets, recommendations

**approval**: Approval decision with status, reviewer, reason

**github**: GitHub PR information (number, URL, branch) - only if approved

**performance**: Timing metrics for each stage and total duration

### Testing

### Example Test Requests

**1. Add Column**:
```json
{
  "description": "Add column email to users",
  "datasetUrn": "urn:li:dataset:(...)",
  "requestedBy": "test@example.com"
}
```

**2. Drop Column**:
```json
{
  "description": "Drop column old_field from users",
  "datasetUrn": "urn:li:dataset:(...)",
  "requestedBy": "test@example.com"
}
```

**3. Rename Column**:
```json
{
  "description": "Rename column username to user_name",
  "datasetUrn": "urn:li:dataset:(...)",
  "requestedBy": "test@example.com"
}
```

**4. High-Risk Change**:
```json
{
  "description": "Drop column customer_id from orders",
  "datasetUrn": "urn:li:dataset:(...)",
  "requestedBy": "test@example.com",
  "priority": "high"
}
```

**5. Low-Risk Change**:
```json
{
  "description": "Add column notes to logs",
  "datasetUrn": "urn:li:dataset:(...)",
  "requestedBy": "test@example.com",
  "priority": "low"
}
```

**6. Missing Datatype**:
```json
{
  "description": "Add column status to users",
  "datasetUrn": "urn:li:dataset:(...)",
  "requestedBy": "test@example.com"
}
```

**7. Dataset with Owner**:
```json
{
  "description": "Add column region to sales",
  "datasetUrn": "urn:li:dataset:(...)",
  "requestedBy": "test@example.com"
}
```

**8. Dataset without Owner**:
```json
{
  "description": "Add column temp to temp_table",
  "datasetUrn": "urn:li:dataset:(...)",
  "requestedBy": "test@example.com"
}
```

**9. Dataset with Downstream Dependencies**:
```json
{
  "description": "Modify column amount in transactions",
  "datasetUrn": "urn:li:dataset:(...)",
  "requestedBy": "test@example.com"
}
```

**10. Duplicate Request/Idempotency**:
```json
{
  "description": "Add column email to users",
  "datasetUrn": "urn:li:dataset:(...)",
  "requestedBy": "test@example.com"
}
// Submit same request twice - second should return cached result
```

## Development / Running the Agent

### Installation

```bash
cd agent
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

### Development

```bash
# Start with file watching
npm run dev

# Start without watching
npm run start

# CLI mode
npm run cli request "Add column email to users"
npm run cli health
```

### Build

```bash
# Compile TypeScript
npm run build
```

### Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio
```

### Linting

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Configuration

### Environment Variables

**DataHub**:
```env
DATAHUB_GMS_URL=http://localhost:8080
DATAHUB_GMS_TOKEN=your_datahub_token
TOOLS_IS_MUTATION_ENABLED=true
```

**Grok (LLM)**:
```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_BASE_URL=https://api.groq.com/openai/v1
```

**GitHub**:
```env
GITHUB_TOKEN=your_github_token
GITHUB_OWNER=your_github_username
GITHUB_REPOSITORY=your_repository
GITHUB_BASE_BRANCH=main
```

**PostgreSQL**:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/lineageguard
```

**Application**:
```env
NODE_ENV=development
LOG_LEVEL=info
```

**Idempotency**:
```env
IDEMPOTENCY_CLEANUP_INTERVAL_MS=300000
IDEMPOTENCY_RETENTION_BUFFER_HOURS=1
IDEMPOTENCY_PENDING_TIMEOUT_MINUTES=10
```

## Project Structure

```
agent/
├── api/                    # API server
│   └── server.ts          # Express server setup
├── approval/              # Approval workflow
│   ├── approval-engine.ts # Approval logic
│   └── types.ts          # Approval types
├── config/                # Configuration
│   ├── config.ts         # App configuration
│   ├── env.ts            # Environment variables
│   └── logger.js         # Logging setup
├── container/             # Dependency injection
│   ├── container.ts      # Development container
│   ├── production-container.ts # Production container
│   └── index.ts          # Container factory
├── context/               # DataHub context gathering
│   ├── context-engine.ts # Context orchestration
│   ├── stages/           # Context collection stages
│   ├── type.ts           # Context types
│   └── validation.ts     # Context validation
├── generators/            # SQL generation
│   ├── generator.ts      # Generator orchestration
│   ├── platform-aware-sql-generator.ts # Platform DDL
│   ├── ddl-generator.ts  # DDL generation
│   ├── rollback.ts       # Rollback generation
│   ├── documentation.ts  # Documentation generation
│   └── sql-validator.ts  # SQL validation
├── github/                # GitHub integration
│   ├── github-engine.ts  # GitHub orchestration
│   ├── github-client.ts  # GitHub client interface
│   ├── octokit-real-client.ts # Real Octokit client
│   ├── branch.ts         # Branch naming
│   ├── commit.ts         # File commits
│   ├── pull-request.ts   # PR creation
│   └── labels.ts         # Label management
├── impact/                # Impact analysis
│   ├── impact-engine.ts  # Impact orchestration
│   ├── metadata-writer.ts # DataHub writeback
│   └── types.ts          # Impact types
├── llm/                   # LLM integration
│   ├── grok.ts           # Grok client
│   ├── grok-adapter.ts   # Grok LLM adapter
│   └── anthropic.ts      # Anthropic client (legacy)
├── mcp/                   # DataHub MCP integration
│   ├── client.ts         # MCP client
│   ├── datahub-client.ts # DataHub-specific client
│   ├── datahub-tags.ts   # Tag management
│   ├── studio-transport.ts # STDIO transport
│   ├── tools/            # MCP tools
│   ├── mutation-registry.ts # Mutation tracking
│   └── types.ts          # MCP types
├── orchestration/         # Workflow orchestration
│   ├── orchestrator.ts   # Main orchestrator
│   ├── pipeline.ts       # Pipeline execution
│   ├── stages/           # Pipeline stages
│   ├── state.ts          # State management
│   ├── type.ts           # Workflow types
│   ├── errors.ts         # Workflow errors
│   └── events.ts         # Workflow events
├── planner/               # LLM planning
│   ├── planning-engine.ts # Planning orchestration
│   ├── planner.ts        # LLM planner
│   ├── parser.ts         # Response parser
│   ├── prompt.ts         # Prompt builder
│   └── types.ts          # Planning types
├── prisma/                # Database schema
│   └── schema.prisma     # Prisma schema
├── risk/                  # Risk assessment
│   ├── risk-engine.ts    # Risk orchestration
│   ├── calculator.ts     # Risk calculation
│   ├── scorer.ts         # Risk scoring
│   └── types.ts          # Risk types
├── src/                   # Entry points
│   ├── index.ts          # Direct execution
│   ├── cli.ts            # CLI interface
│   └── api/              # API server
├── tests/                 # Tests
│   └── unit/             # Unit tests
└── utils/                 # Utilities
    ├── idempotency.ts    # Idempotency service
    ├── performance.ts    # Performance tracking
    ├── retry.ts          # Retry logic
    ├── errors.ts         # Error types
    └── security.ts       # Security utilities
```

## Design Principles

LineageGuard follows these architectural principles:

1. **Context Before Change**: Always gather full context before making changes
2. **AI for Understanding, Deterministic for Execution**: LLM handles semantics, code handles execution
3. **Risk Before Approval**: Assess risk before requiring approval
4. **Approval Before GitHub**: Only create PRs when approved
5. **Idempotency for Reliability**: Prevent duplicate operations
6. **Auditability**: Log all decisions and actions
7. **Platform Awareness**: Generate platform-specific SQL
8. **Separation of Concerns**: Each stage has a single responsibility
9. **Fail-Safe Behavior**: Fail fast with clear error messages
10. **Validation at Every Stage**: Validate all inputs and outputs

## Why This Architecture Matters

LineageGuard is not just an LLM wrapper that generates SQL. It is a comprehensive governed change-management system that combines:

**DataHub Context**: Full metadata understanding including schema, lineage, ownership, and relationships

**LLM Reasoning**: Semantic understanding of natural language requests using Grok

**Deterministic Change Generation**: Platform-aware SQL generation with validation and rollback scripts

**Risk Analysis**: Objective risk scoring based on downstream dependencies and governance factors

**Impact Analysis**: Comprehensive downstream impact identification across datasets, dashboards, and pipelines

**Approval Controls**: Risk-based approval gates with human oversight for high-risk changes

**GitHub Workflow**: Reviewable pull requests with complete documentation and rollback procedures

**Auditability**: Complete audit trail of all decisions, actions, and artifacts

This architecture transforms a natural-language schema request into a reviewable, traceable, risk-aware engineering change that can be safely executed in production environments.
