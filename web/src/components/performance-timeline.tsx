'use client'

import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PerformanceTimelineProps {
  performance?: {
    contextMs: number
    planningMs: number
    riskMs: number
    generationMs: number
    impactMs: number
    approvalMs: number
    githubMs: number
    totalMs: number
  }
  className?: string
}

export function PerformanceTimeline({ performance, className }: PerformanceTimelineProps) {
  if (!performance) {
    return null
  }

  const stages = [
    { name: 'Context', key: 'contextMs', color: 'bg-blue-500' },
    { name: 'Planning', key: 'planningMs', color: 'bg-purple-500' },
    { name: 'Risk', key: 'riskMs', color: 'bg-orange-500' },
    { name: 'Generation', key: 'generationMs', color: 'bg-green-500' },
    { name: 'Impact', key: 'impactMs', color: 'bg-red-500' },
    { name: 'Approval', key: 'approvalMs', color: 'bg-yellow-500' },
    { name: 'GitHub', key: 'githubMs', color: 'bg-pink-500' },
  ]

  const totalMs = performance.totalMs || 0
  const maxStageMs = Math.max(...stages.map(s => performance[s.key as keyof typeof performance] as number))

  return (
    <div className={cn('glass-card rounded-xl p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Performance Timeline</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="font-medium text-foreground">{(totalMs / 1000).toFixed(1)}s</span>
          <span>total</span>
        </div>
      </div>

      {/* Timeline Bar */}
      <div className="mb-6">
        <div className="h-8 rounded-lg overflow-hidden flex">
          {stages.map((stage, index) => {
            const duration = performance[stage.key as keyof typeof performance] as number
            const width = (duration / totalMs) * 100
            return (
              <motion.div
                key={stage.key}
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className={cn('h-full', stage.color)}
                title={`${stage.name}: ${(duration / 1000).toFixed(1)}s`}
              />
            )
          })}
        </div>
      </div>

      {/* Stage Details */}
      <div className="space-y-3">
        {stages.map((stage, index) => {
          const duration = performance[stage.key as keyof typeof performance] as number
          const barWidth = maxStageMs > 0 ? (duration / maxStageMs) * 100 : 0
          
          return (
            <motion.div
              key={stage.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="flex items-center gap-4"
            >
              <div className="w-24 text-sm text-muted-foreground">{stage.name}</div>
              <div className="flex-1 h-6 bg-accent/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.6, delay: 0.4 + index * 0.05 }}
                  className={cn('h-full rounded-full', stage.color)}
                />
              </div>
              <div className="w-20 text-sm font-medium text-right">
                {(duration / 1000).toFixed(1)}s
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-border/50 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-foreground">{(performance.contextMs / 1000).toFixed(1)}s</div>
          <div className="text-xs text-muted-foreground">Context</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{(performance.planningMs / 1000).toFixed(1)}s</div>
          <div className="text-xs text-muted-foreground">Planning</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{(performance.githubMs / 1000).toFixed(1)}s</div>
          <div className="text-xs text-muted-foreground">GitHub</div>
        </div>
      </div>
    </div>
  )
}
