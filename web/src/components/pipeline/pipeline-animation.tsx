'use client'

import { motion } from 'framer-motion'
import { Check, Loader2, Circle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PipelineStage = 'context' | 'planning' | 'risk' | 'generation' | 'impact' | 'approval' | 'github'

export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed'

interface PipelineStageConfig {
  id: PipelineStage
  name: string
  description: string
}

const stages: PipelineStageConfig[] = [
  { id: 'context', name: 'Context', description: 'Gathering schema metadata' },
  { id: 'planning', name: 'Planning', description: 'Analyzing change impact' },
  { id: 'risk', name: 'Risk', description: 'Calculating risk score' },
  { id: 'generation', name: 'Generation', description: 'Generating SQL migration' },
  { id: 'impact', name: 'Impact', description: 'Assessing downstream effects' },
  { id: 'approval', name: 'Approval', description: 'Waiting for review' },
  { id: 'github', name: 'GitHub', description: 'Creating pull request' },
]

interface PipelineAnimationProps {
  currentStage: PipelineStage
  stageStatuses: Record<PipelineStage, PipelineStatus>
  className?: string
}

export function PipelineAnimation({ currentStage, stageStatuses, className }: PipelineAnimationProps) {
  const currentIndex = stages.findIndex(s => s.id === currentStage)

  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-border/50" />
        <motion.div
          className="absolute top-4 left-0 h-0.5 bg-primary"
          initial={{ width: '0%' }}
          animate={{ width: `${((currentIndex + 1) / stages.length) * 100}%` }}
          transition={{ duration: 0.5 }}
        />

        {/* Stages */}
        <div className="relative flex justify-between">
          {stages.map((stage, index) => {
            const status = stageStatuses[stage.id]
            const isCurrent = stage.id === currentStage
            const isPast = index < currentIndex
            const isFuture = index > currentIndex

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center gap-3"
              >
                {/* Stage Icon */}
                <div className="relative">
                  <motion.div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors',
                      isPast && status === 'completed' && 'bg-primary border-primary text-primary-foreground',
                      isCurrent && status === 'running' && 'bg-primary/20 border-primary text-primary',
                      isFuture && 'bg-background border-border text-muted-foreground',
                      status === 'failed' && 'bg-destructive/20 border-destructive text-destructive'
                    )}
                  >
                    {status === 'running' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : status === 'completed' ? (
                      <Check className="h-4 w-4" />
                    ) : status === 'failed' ? (
                      <Circle className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </motion.div>

                  {/* Pulse effect for current stage */}
                  {isCurrent && status === 'running' && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary/30"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </div>

                {/* Stage Name */}
                <div className="text-center">
                  <p className={cn(
                    'text-sm font-medium',
                    isCurrent && 'text-primary',
                    isPast && status === 'completed' && 'text-primary',
                    isFuture && 'text-muted-foreground'
                  )}>
                    {stage.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stage.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface CompactPipelineProps {
  currentStage: PipelineStage
  stageStatuses: Record<PipelineStage, PipelineStatus>
  className?: string
}

export function CompactPipeline({ currentStage, stageStatuses, className }: CompactPipelineProps) {
  const currentIndex = stages.findIndex(s => s.id === currentStage)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {stages.map((stage, index) => {
        const status = stageStatuses[stage.id]
        const isCurrent = stage.id === currentStage
        const isPast = index < currentIndex

        return (
          <div key={stage.id} className="flex items-center">
            <motion.div
              className={cn(
                'w-2 h-2 rounded-full',
                isPast && status === 'completed' && 'bg-primary',
                isCurrent && status === 'running' && 'bg-primary animate-pulse',
                status === 'failed' && 'bg-destructive',
                !isPast && !isCurrent && 'bg-muted'
              )}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
            />
            {index < stages.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground mx-1" />
            )}
          </div>
        )
      })}
    </div>
  )
}
