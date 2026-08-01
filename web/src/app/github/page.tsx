'use client'

import { motion } from 'framer-motion'
import { GitBranch, GitPullRequest, CheckCircle, Clock, ExternalLink, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export default function GitHubPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const { data: prsData, isLoading, error } = useQuery({
    queryKey: ['pull-requests'],
    queryFn: () => apiClient.listPullRequests(),
  })

  const pullRequests = prsData?.data || []

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">GitHub Integration</h1>
        <p className="text-gray-400">Manage pull requests created by LineageGuard</p>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 flex gap-4"
      >
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search pull requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        
        <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </motion.div>

      {/* PR Cards */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 animate-pulse">
              <div className="h-5 w-3/4 bg-gray-600 rounded mb-2" />
              <div className="h-4 w-1/2 bg-gray-600 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <p className="text-red-500">Failed to load pull requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pullRequests.map((pr: any, index: number) => (
            <motion.div
              key={pr.number}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <GitPullRequest className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-400">#{pr.number}</span>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      pr.status === 'merged' && 'bg-purple-500/10 text-purple-500',
                      pr.status === 'open' && 'bg-green-500/10 text-green-500',
                      pr.status === 'closed' && 'bg-red-500/10 text-red-500'
                    )}>
                      {pr.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{pr.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {pr.branch} → {pr.base}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(pr.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-green-500">+{pr.additions}</span>
                    <span className="text-red-500">-{pr.deletions}</span>
                  </div>
                </div>
                <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Reviewers:</span>
                  {pr.reviewers?.map((reviewer: string) => (
                    <span key={reviewer} className="px-2 py-1 rounded bg-white/5 text-xs text-gray-300">
                      {reviewer}
                    </span>
                  ))}
                </div>
                {pr.status === 'merged' && (
                  <div className="flex items-center gap-2 text-green-500 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    Merged by {pr.author}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Connection Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10"
      >
        <h3 className="text-lg font-semibold mb-4 text-white">Connection Status</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">GitHub Repository</span>
            <span className="text-green-500 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Connected
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Repository</span>
            <span className="text-white">company/data-migrations</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Default Branch</span>
            <span className="text-white">main</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">PRs Created</span>
            <span className="text-white">156</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
