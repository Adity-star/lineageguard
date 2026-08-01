# 🛡️ LineageGuard

### AI-powered Schema Change Governance built on DataHub

Transform natural language schema changes into validated database migrations with impact analysis, human approval, DataHub write-back, and automated GitHub pull requests.

> **Read → Understand → Plan → Generate → Assess → Approve → Write Back → Pull Request**

![Demo GIF](https://github.com/your-org/lineageguard/assets/demo.gif)

---

## Why LineageGuard?

Existing AI tools answer: **"What SQL should I write?"**

LineageGuard answers: **"Should this migration exist at all?"**

---

## The Problem

Changing a production database is risky.

A single column rename can silently break:

- 📊 Dashboards
- 🔧 dbt models
- 📦 Downstream datasets
- 🔄 Data pipelines
- 📈 Business reports

Today's AI tools generate SQL without understanding metadata.

That leads to unsafe migrations.

---

## Our Solution

```
Natural Language
       ↓
    DataHub
       ↓
  LineageGuard
       ↓
 Risk Analysis
       ↓
Human Approval
       ↓
  GitHub PR
```

One picture explains everything.

---

## Why DataHub?

LineageGuard uses DataHub as the source of truth.

Instead of guessing...

It understands:

✅ Lineage  
✅ Ownership  
✅ Documentation  
✅ Glossary  
✅ Usage  
✅ Downstream Dependencies  

Every recommendation is grounded in metadata.

---

## Architecture

```
        User
         │
         ▼
  Context Engine
         │
         ▼
 Planning Engine
         │
         ▼
   Risk Engine
         │
         ▼
Generator Engine
         │
         ▼
  Impact Engine
         │
         ▼
Human Approval
         │
         ▼
    DataHub
         │
         ▼
    GitHub
```

---

## Demo

![Demo GIF](https://github.com/your-org/lineageguard/assets/demo.gif)

**30 seconds to see the complete workflow:**

Prompt → Pipeline → Impact → Approve → GitHub PR

---

## Features

🤖 **AI Planning**  
Natural language to execution plan

📊 **Lineage Analysis**  
Understands downstream dependencies

⚠️ **Risk Detection**  
Deterministic risk scoring

🧠 **Human Approval**  
Required for high-risk changes

📝 **SQL Generation**  
Validated migrations with rollback

🔄 **Rollback**  
Automatic rollback scripts

📚 **Documentation**  
Auto-generated migration docs

🐙 **GitHub PR**  
Automated pull requests

🏷️ **DataHub Write-back**  
Metadata governance

---

## Quick Start

```bash
git clone https://github.com/your-org/lineageguard.git
cd lineageguard
cp .env.example .env
docker compose up
```

Done.

---

## Screenshots

### Dashboard
![Dashboard](https://github.com/your-org/lineageguard/assets/dashboard.png)

### Impact Analysis
![Impact](https://github.com/your-org/lineageguard/assets/impact.png)

### Approval
![Approval](https://github.com/your-org/lineageguard/assets/approval.png)

### Pull Request
![PR](https://github.com/your-org/lineageguard/assets/pr.png)

---

## Example Run

**User Request**
```
Rename customer_name to full_name in customers table
```

**Context**
- Dataset: customers (Snowflake)
- Schema: 12 fields
- Lineage: 3 downstream models

**Plan**
- Rename column: customer_name → full_name
- Add index for performance
- Update documentation

**Risk**
- Score: 45/100 (MEDIUM)
- 3 dbt models affected
- 2 dashboards reference column

**SQL**
```sql
ALTER TABLE "customers" RENAME COLUMN "customer_name" TO "full_name";
CREATE INDEX "idx_customers_full_name" ON "customers"("full_name");
```

**Impact**
- 4 downstream assets affected
- 2 high priority updates needed

**Approval**
- Status: PENDING
- Reviewer: john.doe@company.com

**GitHub PR**
- Branch: feat/rename-customer-name
- Files: 3 changed
- Labels: schema-change, needs-review

---

## Project Structure

```
agent/
├── context/      # DataHub metadata gathering
├── planner/      # AI-powered execution planning
├── risk/         # Deterministic risk scoring
├── generators/   # SQL & schema generation
├── impact/       # Impact analysis
├── approval/     # Human approval workflow
├── github/       # GitHub PR automation
└── orchestration/ # Pipeline orchestration

web/
├── app/          # Next.js pages
├── components/   # React components
└── lib/          # Utilities
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js, React, TailwindCSS, Framer Motion |
| Backend | TypeScript, Express |
| Database | PostgreSQL + Prisma |
| AI | Claude (Anthropic) |
| Metadata | DataHub MCP |
| Version Control | GitHub API |
| Containerization | Docker, Docker Compose |
| CI/CD | GitHub Actions |

---

## How It Thinks

```
User Request
     ↓
Reads DataHub
     ↓
Understands lineage
     ↓
Plans migration
     ↓
Validates SQL
     ↓
Calculates risk
     ↓
Waits for approval
     ↓
Writes metadata
     ↓
Creates PR
```

Judges love seeing reasoning.

---

## Future Roadmap

- 🔄 Multi-user approval workflows
- 💬 Slack notifications
- 🎫 Jira integration
- 🧠 Incremental learning from approvals
- 📚 Organization memory
- ☁️ Multi-cloud support
- 🌐 Real-time collaboration
- 📊 Advanced analytics dashboard

---

## Team

- **Your Name** - [GitHub](https://github.com/yourname) - [LinkedIn](https://linkedin.com/in/yourname)
- **Team Member** - [GitHub](https://github.com/teammember) - [LinkedIn](https://linkedin.com/in/teammember)

---

## License

ISC

---

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/lineageguard/issues
- Email: support@lineageguard.dev 
