'use client'

import { motion } from 'framer-motion'
import { Database, Search, Filter, RefreshCw } from 'lucide-react'
import { useState } from 'react'

export default function DataHubPage() {
  const [searchQuery, setSearchQuery] = useState('')

  // Mock data
  const datasets = [
    {
      id: '1',
      name: 'customers',
      platform: 'snowflake',
      owner: 'data-team@company.com',
      description: 'Customer master data',
      tags: ['pii', 'core'],
      lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
    {
      id: '2',
      name: 'orders',
      platform: 'snowflake',
      owner: 'analytics@company.com',
      description: 'Order transactions',
      tags: ['core', 'financial'],
      lastModified: new Date(Date.now() - 1000 * 60 * 60 * 48),
    },
    {
      id: '3',
      name: 'products',
      platform: 'postgres',
      owner: 'inventory@company.com',
      description: 'Product catalog',
      tags: ['inventory'],
      lastModified: new Date(Date.now() - 1000 * 60 * 60 * 72),
    },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">DataHub Integration</h1>
        <p className="text-gray-400">Manage datasets and metadata from DataHub</p>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 flex gap-4"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search datasets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        
        <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Sync
        </button>
      </motion.div>

      {/* Dataset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {datasets.map((dataset, index) => (
          <motion.div
            key={dataset.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
            className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Database className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{dataset.name}</h3>
                  <p className="text-xs text-gray-400 capitalize">{dataset.platform}</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-4">{dataset.description}</p>

            <div className="flex items-center gap-2 mb-4">
              {dataset.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 rounded bg-blue-500/10 text-blue-500 text-xs">
                  {tag}
                </span>
              ))}
            </div>

            <div className="text-xs text-gray-500">
              Owned by {dataset.owner}
            </div>
          </motion.div>
        ))}
      </div>

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
            <span className="text-gray-400">DataHub Instance</span>
            <span className="text-green-500 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Connected
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Last Sync</span>
            <span className="text-white">2 minutes ago</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Datasets Indexed</span>
            <span className="text-white">1,247</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
