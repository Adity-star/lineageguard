import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return formatDate(date)
}

export function getRiskColor(level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): string {
  switch (level) {
    case 'LOW':
      return 'text-green-500'
    case 'MEDIUM':
      return 'text-yellow-500'
    case 'HIGH':
      return 'text-orange-500'
    case 'CRITICAL':
      return 'text-red-500'
    default:
      return 'text-gray-500'
  }
}

export function getRiskBgColor(level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): string {
  switch (level) {
    case 'LOW':
      return 'bg-green-500/10 border-green-500/20'
    case 'MEDIUM':
      return 'bg-yellow-500/10 border-yellow-500/20'
    case 'HIGH':
      return 'bg-orange-500/10 border-orange-500/20'
    case 'CRITICAL':
      return 'bg-red-500/10 border-red-500/20'
    default:
      return 'bg-gray-500/10 border-gray-500/20'
  }
}
