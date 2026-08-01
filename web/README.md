# 🎨 LineageGuard Dashboard

Modern React/Next.js frontend for LineageGuard schema change governance.

## Overview

The dashboard provides a beautiful, intuitive interface for:
- Submitting natural language schema change requests
- Monitoring pipeline execution in real-time
- Reviewing and approving changes with risk assessment
- Visualizing impact analysis and lineage
- Managing GitHub pull requests
- Integrating with DataHub metadata

## Features

🎯 **Natural Language Requests**  
Describe changes in plain English

📊 **Real-time Pipeline Monitoring**  
Watch changes progress through stages

⚠️ **Risk Assessment UI**  
Visual risk scores with color coding

🧠 **Approval Workflow**  
One-click approve/reject with comments

📈 **Impact Visualization**  
See affected assets at a glance

🔄 **Before/After Diffs**  
Side-by-side schema comparison

⏱️ **Performance Timeline**  
See stage durations and metrics

🔗 **DataHub Integration**  
Direct links to metadata

## Quick Start

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

Visit `http://localhost:3000`

## Pages

### Dashboard
- Metrics overview (schema changes, pending reviews, etc.)
- Quick request submission
- Recent activity feed

### Runs
- Active and completed runs
- Pipeline status animation
- Search and filter

### Approvals
- Pending changes requiring review
- Recent approval history
- Risk-based prioritization

### History
- Complete change history
- Advanced filtering
- Search by description, owner, status

### Run Detail
- Performance timeline
- Risk explanation panel
- Before/after schema diff
- Impact analysis with DataHub links
- Generated SQL and rollback
- GitHub PR details

### DataHub
- Dataset catalog view
- Connection status
- Search and filter

### GitHub
- Pull request list
- Status tracking
- Direct links to GitHub

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Animations | Framer Motion |
| Icons | Lucide React |
| Data Fetching | React Query |
| State | React Context |

## Project Structure

```
web/
├── app/              # Next.js app router pages
│   ├── page.tsx      # Dashboard
│   ├── runs/         # Runs list & detail
│   ├── approvals/    # Approval workflow
│   ├── history/      # Change history
│   ├── datahub/      # DataHub integration
│   └── github/       # GitHub PRs
├── components/       # React components
│   ├── pipeline/     # Pipeline animation
│   ├── performance/  # Performance timeline
│   ├── risk/         # Risk explanation
│   └── ui/           # shadcn/ui components
└── lib/              # Utilities & helpers
```

## Configuration

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint
npm run lint
```

## Docker

```bash
docker build -t lineageguard-web .
docker run -p 3000:3000 lineageguard-web
```

Or with Docker Compose:
```bash
docker compose up
```

## Key Components

### PipelineAnimation
Visualizes the 7-stage pipeline with animated progress indicators.

### PerformanceTimeline
Shows stage durations with color-coded bars and summary metrics.

### RiskExplanation
Displays triggered rules, impact factors, and approval requirements.

### SchemaDiff
Side-by-side before/after comparison with change highlighting.

## Styling

Uses Tailwind CSS with custom theme:
- Glass morphism effects
- Gradient backgrounds
- Smooth animations
- Dark mode support

## API Integration

All data fetched from backend API:
- `GET /api/v1/metrics` - Dashboard metrics
- `GET /api/v1/requests` - Runs list
- `GET /api/v1/requests/:id` - Run detail
- `POST /api/v1/requests/:id/approval` - Approve/reject
- `GET /api/v1/datasets` - DataHub datasets
- `GET /api/v1/pull-requests` - GitHub PRs
