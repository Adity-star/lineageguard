'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'
import { cn, getRiskBgColor } from '@/lib/utils'

interface RiskExplanationProps {
  risk?: {
    overallRisk: string
    score: number
    requiresApproval: boolean
    factors?: Array<{
      type: 'warning' | 'success' | 'error' | 'info'
      message: string
      impact: 'high' | 'medium' | 'low'
    }>
  }
  className?: string
}

export function RiskExplanation({ risk, className }: RiskExplanationProps) {
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

  const factors = risk.factors || mockFactors

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

      {/* Approval Status */}
      <div className="mt-6 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Manual Approval Required</span>
          <span className={cn('text-sm font-medium', risk.requiresApproval ? 'text-red-400' : 'text-green-400')}>
            {risk.requiresApproval ? 'Yes' : 'No'}
          </span>
        </div>
      </div>
    </div>
  )
}
