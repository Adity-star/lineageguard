'use client'

import { motion } from 'framer-motion'
import { Database, Bell, Shield, User, Key, Save } from 'lucide-react'
import { useState } from 'react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')

  const tabs = [
    { id: 'general', label: 'General', icon: User },
    { id: 'integrations', label: 'Integrations', icon: Database },
    { id: 'github', label: 'GitHub', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400">Configure your LineageGuard instance</p>
      </motion.div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="w-64"
        >
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-1',
                  activeTab === tab.id
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1"
        >
          {activeTab === 'general' && <GeneralSettings />}
          {activeTab === 'integrations' && <IntegrationSettings />}
          {activeTab === 'github' && <GitHubSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'security' && <SecuritySettings />}
        </motion.div>
      </div>
    </div>
  )
}

function GeneralSettings() {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
      <h2 className="text-xl font-semibold mb-6 text-white">General Settings</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Organization Name</label>
          <input
            type="text"
            defaultValue="Acme Corp"
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Default Risk Threshold</label>
          <select className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            <option value="low">Low (Auto-approve low risk)</option>
            <option value="medium">Medium (Require approval for medium+)</option>
            <option value="high">High (Require approval for all)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
          <select className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            <option value="utc">UTC</option>
            <option value="est">Eastern Time</option>
            <option value="pst">Pacific Time</option>
          </select>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <p className="font-medium text-white">Dark Mode</p>
            <p className="text-sm text-gray-400">Always use dark theme</p>
          </div>
          <div className="w-12 h-6 bg-blue-500 rounded-full relative">
            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
          </div>
        </div>

        <button className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </button>
      </div>
    </div>
  )
}

function IntegrationSettings() {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
      <h2 className="text-xl font-semibold mb-6 text-white">DataHub Integration</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">DataHub URL</label>
          <input
            type="url"
            defaultValue="https://datahub.acme.com"
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">API Token</label>
          <div className="flex gap-2">
            <input
              type="password"
              defaultValue="••••••••••••••••"
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
              <Key className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div>
            <p className="font-medium text-green-500">Connection Active</p>
            <p className="text-sm text-gray-400">Last synced: 2 minutes ago</p>
          </div>
          <button className="px-4 py-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition-colors">
            Test Connection
          </button>
        </div>

        <button className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </button>
      </div>
    </div>
  )
}

function GitHubSettings() {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
      <h2 className="text-xl font-semibold mb-6 text-white">GitHub Integration</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Repository Owner</label>
          <input
            type="text"
            defaultValue="acme-corp"
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Repository Name</label>
          <input
            type="text"
            defaultValue="data-migrations"
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Default Branch</label>
          <input
            type="text"
            defaultValue="main"
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Personal Access Token</label>
          <div className="flex gap-2">
            <input
              type="password"
              defaultValue="••••••••••••••••"
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
              <Key className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div>
            <p className="font-medium text-green-500">Connection Active</p>
            <p className="text-sm text-gray-400">Repository: acme-corp/data-migrations</p>
          </div>
          <button className="px-4 py-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition-colors">
            Test Connection
          </button>
        </div>

        <button className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </button>
      </div>
    </div>
  )
}

function NotificationSettings() {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
      <h2 className="text-xl font-semibold mb-6 text-white">Notification Settings</h2>
      
      <div className="space-y-4">
        {[
          { title: 'Email notifications for pending approvals', description: 'Receive email when approval is required' },
          { title: 'Slack integration', description: 'Send notifications to Slack channel' },
          { title: 'PR status updates', description: 'Get notified when PR status changes' },
          { title: 'Risk alerts', description: 'Alert for high-risk changes' },
        ].map((setting, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <p className="font-medium text-white">{setting.title}</p>
              <p className="text-sm text-gray-400">{setting.description}</p>
            </div>
            <div className="w-12 h-6 bg-gray-600 rounded-full relative cursor-pointer hover:bg-gray-500 transition-colors">
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
            </div>
          </div>
        ))}

        <button className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </button>
      </div>
    </div>
  )
}

function SecuritySettings() {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
      <h2 className="text-xl font-semibold mb-6 text-white">Security Settings</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
          <input
            type="password"
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
          <input
            type="password"
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
          <input
            type="password"
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <p className="font-medium text-white">Two-Factor Authentication</p>
            <p className="text-sm text-gray-400">Add extra security to your account</p>
          </div>
          <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
            Enable
          </button>
        </div>

        <button className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </button>
      </div>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
