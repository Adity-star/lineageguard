'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  Play, 
  CheckCircle, 
  History, 
  Database, 
  GitBranch, 
  Settings,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Runs', href: '/runs', icon: Play },
  { name: 'Approvals', href: '/approvals', icon: CheckCircle },
  { name: 'History', href: '/history', icon: History },
  { name: 'DataHub', href: '/datahub', icon: Database },
  { name: 'GitHub', href: '/github', icon: GitBranch },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className="fixed left-0 top-0 z-50 h-screen w-64 border-r border-white/10 bg-black/80 backdrop-blur-xl"
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <Sparkles className="h-6 w-6 text-blue-500" />
          <span className="ml-2 text-lg font-semibold">LineageGuard</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-white'
                  )}
                />
                <span className="ml-3">{item.name}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 h-8 w-1 rounded-r-full bg-blue-500"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Admin User</p>
              <p className="text-xs text-gray-400">admin@company.com</p>
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  )
}
