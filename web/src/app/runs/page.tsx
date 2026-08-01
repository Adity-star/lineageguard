'use client'

import { motion } from 'framer-motion'
import { Clock, AlertTriangle, CheckCircle, Loader2, Search } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export default function RunsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const { data: requestsData, isLoading, error } = useQuery({
    queryKey: ['requests'],
    queryFn: () => apiClient.listRequests({ limit: 50 }),
  })

  const runs = requestsData?.data || []

  const filteredRuns = runs.filter((run: any) => 
    run.request?.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 animate-pulse">
              <div className="h-5 w-3/4 bg-gray-600 rounded mb-2" />
              <div className="h-4 w-1/2 bg-gray-600 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <p className="text-red-500">Failed to load runs</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRuns.map((run: any, index: number) => {
            const risk = run.result?.risk
            const riskLevel = risk?.overallRisk || 'MEDIUM'
            const riskScore = risk?.score || 50
            const pipelineStage = 'github' // Default for completed runs

            return (
              <motion.div
                key={run.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
              >
                {/* Quick Summary - What Changed */}
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-white">What Changed?</span>
                  </div>
                  <div className="text-lg font-medium text-white mb-2">
                    {run.request?.description || 'Unknown request'}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-gray-400">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      <span>{run.result?.plan?.affectedColumns?.length || 0} columns affected</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                      <span>{run.result?.impact?.affectedAssets?.length || 0} assets impacted</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(run.createdAt)}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getRiskBgColor(riskLevel as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'))}>
                        {riskLevel} ({riskScore})
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

                {/* Impact Summary - What Breaks */}
                {run.result?.impact && (
                  <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-semibold text-white">What Breaks?</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        <span>{run.result.impact.affectedAssets?.length || 0} downstream assets affected</span>
                      </div>
                      {run.result.impact.affectedAssets?.slice(0, 3).map((asset: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-gray-400 pl-4">
                          <span className="text-xs">{asset.name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-white/5">{asset.type}</span>
                        </div>
                      ))}
                      {(run.result.impact.affectedAssets?.length || 0) > 3 && (
                        <div className="text-gray-500 text-xs pl-4">
                          +{run.result.impact.affectedAssets.length - 3} more assets
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pipeline Progress */}
                <div className="flex items-center gap-2">
                  {['context', 'planning', 'risk', 'generation', 'impact', 'approval', 'github'].map((stage, i) => {
                    const stageIndex = ['context', 'planning', 'risk', 'generation', 'impact', 'approval', 'github'].indexOf(pipelineStage)
                    const isPast = i < stageIndex
                    const isCurrent = i === stageIndex
                    const isFuture = i > stageIndex

                    return (
                      <div key={stage} className="flex items-center">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          isPast && 'bg-blue-500',
                          isCurrent && 'bg-blue-500 animate-pulse',
                          isFuture && 'bg-gray-600'
                        )} />
                        {i < 6 && <div className="w-8 h-0.5 bg-gray-600" />}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {filteredRuns.length === 0 && !isLoading && (
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

function getRiskBgColor(level: string): string {
  switch (level) {
    case 'LOW':
      return 'bg-green-500/10 text-green-500'
    case 'MEDIUM':
      return 'bg-yellow-500/10 text-yellow-500'
    case 'HIGH':
      return 'bg-orange-500/10 text-orange-500'
    case 'CRITICAL':
      return 'bg-red-500/10 text-red-500'
    default:
      return 'bg-gray-500/10 text-gray-500'
  }
}
