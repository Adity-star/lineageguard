'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Clock, AlertTriangle, GitPullRequest, User, Calendar } from 'lucide-react'
import Link from 'next/link'
import { PipelineAnimation, PipelineStage, PipelineStatus } from '@/components/pipeline/pipeline-animation'
import { cn, getRiskColor, getRiskBgColor, formatDate } from '@/lib/utils'
import { useState } from 'react'

export default function RunDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState('overview')

  // Mock data - in production this would come from the API
  const runData = {
    id: params.id,
    description: 'Rename customer_name to full_name in customers table',
    status: 'waiting_approval' as const,
    risk: 'MEDIUM' as const,
    score: 45,
    approvalRequired: true,
    reviewer: 'john.doe@company.com',
    createdAt: new Date(Date.now() - 1000 * 60 * 15),
    confidence: 0.92,
  }

  const stageStatuses: Record<PipelineStage, PipelineStatus> = {
    context: 'completed',
    planning: 'completed',
    risk: 'completed',
    generation: 'completed',
    impact: 'completed',
    approval: 'running',
    github: 'pending',
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'diff', label: 'Diff' },
    { id: 'impact', label: 'Impact' },
    { id: 'sql', label: 'SQL' },
    { id: 'rollback', label: 'Rollback' },
    { id: 'documentation', label: 'Documentation' },
    { id: 'github', label: 'GitHub' },
    { id: 'datahub', label: 'DataHub' },
  ]

  return (
    <div className="p-8">
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{runData.description}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(runData.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                15m ago
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn('px-4 py-2 rounded-lg text-sm font-medium', getRiskBgColor(runData.risk))}>
              {runData.risk} ({runData.score}/100)
            </div>
            {runData.approvalRequired && (
              <div className="px-4 py-2 rounded-lg bg-yellow-500/10 text-yellow-500 text-sm font-medium">
                Approval Required
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Animation */}
        <PipelineAnimation
          currentStage="approval"
          stageStatuses={stageStatuses}
          className="mb-8"
        />
      </motion.div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Left Content */}
        <div className="flex-1">
          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex gap-1 mb-6 border-b border-border/50">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-4 py-3 text-sm font-medium transition-colors relative',
                    activeTab === tab.id
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && <OverviewTab runData={runData} />}
              {activeTab === 'diff' && <DiffTab />}
              {activeTab === 'impact' && <ImpactTab />}
              {activeTab === 'sql' && <SQLTab />}
              {activeTab === 'rollback' && <RollbackTab />}
              {activeTab === 'documentation' && <DocumentationTab />}
              {activeTab === 'github' && <GitHubTab />}
              {activeTab === 'datahub' && <DataHubTab />}
            </motion.div>
          </motion.div>
        </div>

        {/* Right Approval Panel */}
        <div className="w-80">
          <ApprovalPanel runData={runData} />
        </div>
      </div>
    </div>
  )
}

function OverviewTab({ runData }: { runData: any }) {
  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">AI Summary</h3>
        <p className="text-muted-foreground leading-relaxed">
          This change renames the <code className="bg-accent px-1.5 py-0.5 rounded">customer_name</code> column to <code className="bg-accent px-1.5 py-0.5 rounded">full_name</code> in the customers table. This is a low-risk change that improves naming consistency without affecting data integrity or downstream dependencies.
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Confidence:</span>
          <span className="font-medium">{(runData.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">AI Reasoning</h3>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Column rename is a non-breaking change for most applications</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>No downstream dashboards or reports depend on this column</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <span>3 dbt models reference this column - may need updates</span>
          </li>
        </ul>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Update dbt models that reference customer_name</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Notify data team of schema change</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Run data validation after migration</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

function DiffTab() {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Schema Diff</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Before</h4>
          <pre className="bg-accent/50 rounded-lg p-4 text-sm overflow-x-auto">
            <code>{`model Customer {
  id        Int    @id
  email     String
  customer_name String
  created_at DateTime
}`}</code>
          </pre>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">After</h4>
          <pre className="bg-accent/50 rounded-lg p-4 text-sm overflow-x-auto">
            <code>{`model Customer {
  id        Int    @id
  email     String
  full_name String
  created_at DateTime
}`}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}

function ImpactTab() {
  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Affected Assets</h3>
        <div className="space-y-3">
          {[
            { type: 'Dataset', name: 'customers', impact: 'high' },
            { type: 'dbt Model', name: 'customer_orders', impact: 'medium' },
            { type: 'dbt Model', name: 'customer_analytics', impact: 'medium' },
            { type: 'Dashboard', name: 'Customer Overview', impact: 'low' },
          ].map((asset, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
              <div>
                <p className="font-medium">{asset.name}</p>
                <p className="text-sm text-muted-foreground">{asset.type}</p>
              </div>
              <span className={cn('px-2 py-1 rounded text-xs font-medium', getRiskBgColor(asset.impact === 'high' ? 'HIGH' : asset.impact === 'medium' ? 'MEDIUM' : 'LOW'))}>
                {asset.impact}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SQLTab() {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Generated SQL</h3>
      <pre className="bg-accent/50 rounded-lg p-4 text-sm overflow-x-auto">
        <code>{`-- Rename column customer_name to full_name
ALTER TABLE "customers" 
RENAME COLUMN "customer_name" TO "full_name";

-- Create index for performance
CREATE INDEX "idx_customers_full_name" 
ON "customers"("full_name");`}</code>
      </pre>
      <div className="mt-4 flex items-center gap-2">
        <span className="px-2 py-1 rounded bg-green-500/10 text-green-500 text-xs font-medium">
          ✓ Validated
        </span>
        <button className="text-sm text-primary hover:underline">Copy</button>
        <button className="text-sm text-primary hover:underline">Download</button>
      </div>
    </div>
  )
}

function RollbackTab() {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Rollback SQL</h3>
      <pre className="bg-accent/50 rounded-lg p-4 text-sm overflow-x-auto">
        <code>{`-- Rollback: Rename full_name back to customer_name
ALTER TABLE "customers" 
RENAME COLUMN "full_name" TO "customer_name";

-- Drop index
DROP INDEX "idx_customers_full_name";`}</code>
      </pre>
      <div className="mt-4 flex items-center gap-2">
        <span className="px-2 py-1 rounded bg-green-500/10 text-green-500 text-xs font-medium">
          ✓ Validated
        </span>
        <button className="text-sm text-primary hover:underline">Copy</button>
        <button className="text-sm text-primary hover:underline">Download</button>
      </div>
    </div>
  )
}

function DocumentationTab() {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Documentation</h3>
      <div className="prose prose-invert max-w-none">
        <h4>Change Summary</h4>
        <p>Renames the customer_name column to full_name to improve naming consistency across the data model.</p>
        
        <h4>Impact Analysis</h4>
        <p>This change affects 3 dbt models that reference the customer_name column. These models will need to be updated to use the new column name.</p>
        
        <h4>Migration Notes</h4>
        <ul>
          <li>Data is preserved during the rename operation</li>
          <li>Index added for query performance</li>
          <li>Rollback script provided for emergency reversal</li>
        </ul>
      </div>
    </div>
  )
}

function GitHubTab() {
  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Pull Request</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Branch</span>
            <span className="font-mono">feat/rename-customer-name</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Base</span>
            <span className="font-mono">main</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Files Changed</span>
            <span>3</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Labels</span>
            <div className="flex gap-1">
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-xs">schema-change</span>
              <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 text-xs">needs-review</span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Reviewers</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2 bg-accent/50 rounded-lg">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
            <div>
              <p className="font-medium text-sm">John Doe</p>
              <p className="text-xs text-muted-foreground">john.doe@company.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DataHubTab() {
  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Metadata Changes</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Documentation</h4>
            <div className="bg-accent/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">Before:</p>
              <p className="mb-2">Customer name field</p>
              <p className="text-muted-foreground">After:</p>
              <p>Full customer name field</p>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2">Tags</h4>
            <div className="flex gap-2">
              <span className="px-2 py-1 rounded bg-primary/10 text-primary text-xs">+ schema-change</span>
              <span className="px-2 py-1 rounded bg-green-500/10 text-green-500 text-xs">+ reviewed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ApprovalPanel({ runData }: { runData: any }) {
  const [comment, setComment] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="sticky top-20"
    >
      <div className="glass-panel rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Approval</h3>
        
        {/* Risk Badge */}
        <div className={cn('mb-4 p-4 rounded-lg', getRiskBgColor(runData.risk))}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">{runData.risk} Risk</span>
          </div>
          <p className="text-sm opacity-90">
            Score: {runData.score}/100
          </p>
        </div>

        {/* Reviewer */}
        <div className="mb-4 p-3 bg-accent/50 rounded-lg">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Assigned to</p>
              <p className="text-xs text-muted-foreground">{runData.reviewer}</p>
            </div>
          </div>
        </div>

        {/* Comment */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">Comment (required for rejection)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add any notes or concerns..."
            className="w-full bg-accent/50 border border-border/50 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px]"
          />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => setIsApproving(true)}
            disabled={isApproving || isRejecting}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isApproving ? (
              <>
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Approve Change
              </>
            )}
          </button>
          
          <button
            onClick={() => setIsRejecting(true)}
            disabled={isApproving || isRejecting}
            className="w-full py-2.5 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isRejecting ? (
              <>
                <div className="h-4 w-4 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                Reject Change
              </>
            )}
          </button>
        </div>

        {/* Warnings */}
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-xs text-yellow-500">
            ⚠️ This will update DataHub metadata and create a GitHub PR
          </p>
        </div>
      </div>
    </motion.div>
  )
}
