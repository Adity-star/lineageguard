'use client'

import { motion } from 'framer-motion'
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle, GitPullRequest, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Metrics } from '@/lib/types'

const examples = [
  'Rename customer_name to full_name',
  'Drop deprecated column old_status',
  'Split address into city/state/country',
  'Merge customers and contacts tables',
  'Add index on email for performance',
]

export default function Dashboard() {
  const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => apiClient.getMetrics(),
  })

  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['requests'],
    queryFn: () => apiClient.listRequests({ limit: 3 }),
  })

  const metrics = metricsData?.data
  const recentRuns = requestsData?.data || []

  const metricsList = metrics ? [
    { name: 'Schema Changes', value: metrics.schemaChanges.toString(), change: '+12%', icon: TrendingUp, color: 'text-blue-500' },
    { name: 'Pending Reviews', value: metrics.pendingReviews.toString(), change: '+2', icon: AlertTriangle, color: 'text-yellow-500' },
    { name: 'Critical Changes', value: metrics.criticalChanges.toString(), change: '-1', icon: AlertTriangle, color: 'text-red-500' },
    { name: 'Auto Approved', value: metrics.autoApproved.toString(), change: '+15', icon: CheckCircle, color: 'text-green-500' },
    { name: 'PRs Created', value: metrics.prsCreated.toString(), change: '+8', icon: GitPullRequest, color: 'text-purple-500' },
    { name: 'Avg Risk Score', value: metrics.avgRiskScore.toString(), change: '-5', icon: TrendingUp, color: 'text-orange-500' },
  ] : []

  return (
    <div className="p-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="text-4xl font-bold mb-2">Describe your schema change</h1>
        <p className="text-gray-400 text-lg">
          AI-powered governance built on DataHub
        </p>
      </motion.div>

      {/* AI Prompt Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-12"
      >
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <div className="flex items-start gap-4 mb-4">
            <Sparkles className="h-6 w-6 text-blue-500 mt-1" />
            <div className="flex-1">
              <textarea
                placeholder="Describe what you want to change..."
                className="w-full bg-transparent border-0 text-lg resize-none focus:outline-none placeholder:text-gray-500 min-h-[100px] text-white"
                rows={4}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {examples.map((example) => (
                <button
                  key={example}
                  className="px-3 py-1.5 text-sm rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                  {example}
                </button>
              ))}
            </div>
            <button className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate
            </button>
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      {metricsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 animate-pulse">
              <div className="h-5 w-5 bg-gray-600 rounded mb-4" />
              <div className="h-8 w-16 bg-gray-600 rounded mb-2" />
              <div className="h-4 w-24 bg-gray-600 rounded" />
            </div>
          ))}
        </div>
      ) : metricsError ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-12">
          <p className="text-red-500">Failed to load metrics</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
        >
          {metricsList.map((metric, index) => (
            <motion.div
              key={metric.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <metric.icon className={cn('h-5 w-5', metric.color)} />
                <span className={cn('text-sm font-medium', metric.change.startsWith('+') ? 'text-green-500' : 'text-red-500')}>
                  {metric.change}
                </span>
              </div>
              <div className="text-3xl font-bold mb-1 text-white">{metric.value}</div>
              <div className="text-sm text-gray-400">{metric.name}</div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Recent Runs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-2xl font-bold mb-6">Recent Runs</h2>
        {requestsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-xl rounded-xl p-4 animate-pulse">
                <div className="h-5 w-3/4 bg-gray-600 rounded mb-2" />
                <div className="h-4 w-1/2 bg-gray-600 rounded" />
              </div>
            ))}
          </div>
        ) : recentRuns.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-8 text-center">
            <p className="text-gray-400">No recent runs found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentRuns.map((run: any) => (
              <motion.div
                key={run.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/5 backdrop-blur-xl rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex-1">
                  <p className="font-medium mb-1 text-white">{run.request?.description || 'Unknown request'}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(run.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium',
                  run.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                  run.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                  run.status === 'running' ? 'bg-blue-500/10 text-blue-500' :
                  'bg-gray-500/10 text-gray-500'
                )}>
                  {run.status}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
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
