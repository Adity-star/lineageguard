'use client'

import { motion } from 'framer-motion'
import { Clock, GitPullRequest, AlertTriangle, CheckCircle, XCircle, Search } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [riskFilter, setRiskFilter] = useState<string>('all')

  const { data: requestsData, isLoading, error } = useQuery({
    queryKey: ['requests', statusFilter],
    queryFn: () => apiClient.listRequests({ 
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: 50 
    }),
  })

  const runs = requestsData?.data || []

  const filteredRuns = runs.filter((run: any) => {
    const matchesSearch = run.request?.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRisk = riskFilter === 'all' || run.result?.risk?.overallRisk === riskFilter
    return matchesSearch && matchesRisk
  })

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">Run History</h1>
        <p className="text-muted-foreground">View all schema change requests and their status</p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 flex gap-4"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search runs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-accent/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-lg bg-accent/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="waiting">Waiting</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="px-4 py-2 rounded-lg bg-accent/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Risk Levels</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </motion.div>

      {/* Run Cards */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 animate-pulse">
              <div className="h-5 w-3/4 bg-gray-600 rounded mb-2" />
              <div className="h-4 w-1/2 bg-gray-600 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <p className="text-red-500">Failed to load history</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRuns.map((run: any, index: number) => (
            <motion.div
              key={run.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="bg-white/5 backdrop-blur-xl rounded-xl p-6 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{run.request?.description || 'Unknown request'}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(run.createdAt)}
                    </span>
                    {run.result?.github?.url && (
                      <span className="flex items-center gap-1">
                        <GitPullRequest className="h-3 w-3" />
                        <a href={run.result.github.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          PR
                        </a>
                      </span>
                    )}
                    {run.approval?.reviewer && (
                      <span>Approved by {run.approval.reviewer}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {run.result?.risk && (
                    <div className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', getRiskBgColor(run.result.risk.overallRisk as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'))}>
                      {run.result.risk.overallRisk} ({run.result.risk.score})
                    </div>
                  )}
                  <div className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2',
                    run.status === 'completed' || run.status === 'approved' && 'bg-green-500/10 text-green-500',
                    run.status === 'pending' && 'bg-yellow-500/10 text-yellow-500',
                    run.status === 'waiting' && 'bg-blue-500/10 text-blue-500',
                    run.status === 'rejected' && 'bg-red-500/10 text-red-500'
                  )}>
                    {run.status === 'completed' && <CheckCircle className="h-4 w-4" />}
                    {run.status === 'approved' && <CheckCircle className="h-4 w-4" />}
                    {run.status === 'pending' && <Clock className="h-4 w-4" />}
                    {run.status === 'waiting' && <AlertTriangle className="h-4 w-4" />}
                    {run.status === 'rejected' && <XCircle className="h-4 w-4" />}
                    {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {filteredRuns.length === 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-gray-400">No runs found matching your filters</p>
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
