'use client'

import { motion } from 'framer-motion'
import { Clock, AlertTriangle, CheckCircle, Loader2, Search } from 'lucide-react'
import { cn, getRiskBgColor, formatRelativeTime } from '@/lib/utils'
import { useState } from 'react'

export default function RunsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  // Mock data
  const runs = [
    {
      id: '1',
      description: 'Rename customer_name to full_name',
      status: 'completed',
      risk: 'LOW',
      score: 25,
      createdAt: new Date(Date.now() - 1000 * 60 * 2),
      pipelineStage: 'github',
    },
    {
      id: '2',
      description: 'Add index on email column',
      status: 'running',
      risk: 'MEDIUM',
      score: 45,
      createdAt: new Date(Date.now() - 1000 * 60 * 15),
      pipelineStage: 'impact',
    },
    {
      id: '3',
      description: 'Drop deprecated status column',
      status: 'waiting',
      risk: 'HIGH',
      score: 72,
      createdAt: new Date(Date.now() - 1000 * 60 * 60),
      pipelineStage: 'approval',
    },
    {
      id: '4',
      description: 'Split address into city/state/country',
      status: 'pending',
      risk: 'MEDIUM',
      score: 38,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      pipelineStage: 'context',
    },
  ]

  const filteredRuns = runs.filter(run => 
    run.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">Active Runs</h1>
        <p className="text-gray-400">Monitor schema change pipeline executions</p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search runs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </motion.div>

      {/* Run Cards */}
      <div className="space-y-4">
        {filteredRuns.map((run, index) => (
          <motion.div
            key={run.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
            className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2 text-white">{run.description}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(run.createdAt)}
                  </span>
                  <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getRiskBgColor(run.risk as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'))}>
                    {run.risk} ({run.score})
                  </span>
                </div>
              </div>
              <div className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2',
                run.status === 'completed' && 'bg-green-500/10 text-green-500',
                run.status === 'running' && 'bg-blue-500/10 text-blue-500',
                run.status === 'waiting' && 'bg-yellow-500/10 text-yellow-500',
                run.status === 'pending' && 'bg-gray-500/10 text-gray-500'
              )}>
                {run.status === 'running' && <Loader2 className="h-4 w-4 animate-spin" />}
                {run.status === 'completed' && <CheckCircle className="h-4 w-4" />}
                {run.status === 'waiting' && <AlertTriangle className="h-4 w-4" />}
                {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
              </div>
            </div>

            {/* Pipeline Progress */}
            <div className="flex items-center gap-2">
              {['context', 'planning', 'risk', 'generation', 'impact', 'approval', 'github'].map((stage, i) => {
                const stageIndex = ['context', 'planning', 'risk', 'generation', 'impact', 'approval', 'github'].indexOf(run.pipelineStage)
                const isPast = i < stageIndex
                const isCurrent = i === stageIndex
                const isFuture = i > stageIndex

                return (
                  <div key={stage} className="flex items-center">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      isPast && 'bg-blue-500',
                      isCurrent && 'bg-blue-500 animate-p pulse',
                      isFuture && 'bg-gray-600'
                    )} />
                    {i < 6 && <div className="w-8 h-0.5 bg-gray-600" />}
                  </div>
                )
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {filteredRuns.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-gray-400">No runs found</p>
        </motion.div>
      )}
    </div>
  )
}
