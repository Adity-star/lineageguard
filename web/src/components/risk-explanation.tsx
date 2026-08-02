'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, ArrowDown, CheckCircle, Info, XCircle } from 'lucide-react'
import { cn, getRiskBgColor } from '@/lib/utils'

interface RiskExplanationProps {
  request?: {
    description: string
    // Example: "Rename customer_name to full_name"
    // Could include other metadata
  }
  impact?: {
    datasets?: number
    dashboards?: number
    pipelines?: number
  }
  risk?: {
    overallRisk: string
    score: number
    requiresApproval: boolean
    factors?: Array<{
      type: 'warning' | 'success' | 'error' | 'info'
      message: string
      impact: 'high' | 'medium' | 'low'
    }>
    evidencePaths?: Array<{
      nodes: string[]
    }>
  }
  className?: string
}

export function RiskExplanation({ request, impact, risk, className }: RiskExplanationProps) {
  if (!risk) {
    return null
  }

  const mockFactors = [
    {
      type: 'warning' as const,
      message: '3 downstream dbt models reference this column',
      impact: 'medium' as const,
    },
    {
      type: 'warning' as const,
      message: 'Column is used in 2 production dashboards',
      impact: 'medium' as const,
    },
    {
      type: 'success' as const,
      message: 'Column rename is a non-breaking change',
      impact: 'low' as const,
    },
    {
      type: 'success' as const,
      message: 'No data loss expected during migration',
      impact: 'low' as const,
    },
    {
      type: 'info' as const,
      message: 'Rollback script generated automatically',
      impact: 'low' as const,
    },
  ]

  const mockEvidencePaths = [
    {
      nodes: ['orders', 'sales_dashboard', 'executive_metrics'],
    },
    {
      nodes: ['customers', 'customer_analytics', 'marketing_sync_job'],
    }
  ]

  const factors = risk.factors || mockFactors
  const evidencePaths = risk.evidencePaths || mockEvidencePaths

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'low':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  return (
    <div className={cn('glass-card rounded-xl p-6', className)}>
      {request && (
        <div className="mb-4">
          <h3 className="text-lg font-medium">Request</h3>
          <p className="text-sm text-muted-foreground">{request.description}</p>
        </div>
      )}
      {impact && (
        <div className="mb-4">
          <h3 className="text-lg font-medium">Impact</h3>
          <ul className="list-disc list-inside space-y-1">
            {impact.datasets !== undefined && <li>{impact.datasets} datasets affected</li>}
            {impact.dashboards !== undefined && <li>{impact.dashboards} dashboards affected</li>}
            {impact.pipelines !== undefined && <li>{impact.pipelines} pipelines affected</li>}
          </ul>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Risk Assessment Explanation</h3>
        <div className={cn('px-3 py-1.5 rounded-lg text-sm font-bold', getRiskBgColor(risk.overallRisk as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'))}>
          {risk.overallRisk} ({risk.score}/100)
        </div>
      </div>

      {/* Summary */}
      <div className={cn('mb-6 p-4 rounded-lg border', getRiskBgColor(risk.overallRisk as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'))}>
        <p className="text-sm">
          {risk.overallRisk === 'HIGH' && 'This change has significant downstream impact and requires careful review.'}
          {risk.overallRisk === 'MEDIUM' && 'This change has moderate impact and should be reviewed before proceeding.'}
          {risk.overallRisk === 'LOW' && 'This change has minimal impact and can proceed with standard review.'}
          {risk.overallRisk === 'CRITICAL' && 'This change has critical impact and requires immediate attention.'}
        </p>
      </div>

      {/* Triggered Rules */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Triggered Rules</h4>
        {factors.map((factor, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3 p-3 bg-accent/50 rounded-lg"
          >
            <div className="mt-0.5">{getIcon(factor.type)}</div>
            <div className="flex-1">
              <p className="text-sm">{factor.message}</p>
            </div>
            <span className={cn('px-2 py-0.5 rounded text-xs font-medium border', getImpactColor(factor.impact))}>
              {factor.impact}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Evidence Paths */}
      <div className="mt-6 pt-4 border-t border-border/50">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Evidence Paths</h4>
        <div className="space-y-4">
          {evidencePaths.map((path, pIdx) => (
            <div key={pIdx} className="bg-accent/30 rounded-lg p-4 border border-border/20">
              <div className="text-xs text-muted-foreground mb-2 font-medium">Evidence Path #{pIdx + 1}</div>
              <div className="flex flex-col items-center gap-1.5">
                {path.nodes.map((node, nIdx) => (
                  <div key={nIdx} className="flex flex-col items-center w-full">
                    <div className="px-3 py-1 bg-background rounded border border-border/30 text-sm font-mono w-full text-center truncate max-w-md shadow-sm">
                      {node}
                    </div>
                    {nIdx < path.nodes.length - 1 && (
                      <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/60 my-1 animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation & Approval */}
      <div className="mt-6 pt-4 border-t border-border/50">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Recommendation</h4>
        <p className="text-sm mb-2">Manual approval required.</p>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">Approve</button>
          <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition">Reject</button>
        </div>
      </div>
    </div>
  )
}
