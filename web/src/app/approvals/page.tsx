'use client'

import { motion } from 'framer-motion'
import { Clock, AlertTriangle, User, Calendar, CheckCircle, XCircle, MessageSquare } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export default function ApprovalsPage() {
  const [selectedTab, setSelectedTab] = useState('pending')
  const queryClient = useQueryClient()

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['requests'],
    queryFn: () => apiClient.listRequests({ limit: 50 }),
  })

  const approveMutation = useMutation({
    mutationFn: ({ requestId, approved, reviewer, comment }: any) =>
      apiClient.decideApproval(requestId, { approved, reviewer, comment, decidedAt: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] })
    },
  })

  const allRequests = requestsData?.data || []
  
  const pendingApprovals = allRequests.filter((r: any) => r.status === 'pending' || r.status === 'waiting')
  const recentApprovals = allRequests.filter((r: any) => r.status === 'approved' || r.status === 'rejected')

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">Approvals</h1>
        <p className="text-muted-foreground">Review and approve pending schema changes</p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex gap-1 mb-6 border-b border-border/50">
          <button
            onClick={() => setSelectedTab('pending')}
            className={cn(
              'px-4 py-3 text-sm font-medium transition-colors relative',
              selectedTab === 'pending'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Pending ({pendingApprovals.length})
            {selectedTab === 'pending' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </button>
          <button
            onClick={() => setSelectedTab('recent')}
            className={cn(
              'px-4 py-3 text-sm font-medium transition-colors relative',
              selectedTab === 'recent'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Recent
            {selectedTab === 'recent' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {selectedTab === 'pending' && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 animate-pulse">
                      <div className="h-5 w-3/4 bg-gray-600 rounded mb-2" />
                      <div className="h-4 w-1/2 bg-gray-600 rounded" />
                    </div>
                  ))}
                </div>
              ) : pendingApprovals.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-xl rounded-xl p-8 text-center">
                  <p className="text-gray-400">No pending approvals</p>
                </div>
              ) : (
                pendingApprovals.map((approval: any, index: number) => (
                  <PendingApprovalCard 
                    key={approval.id} 
                    approval={approval} 
                    index={index}
                    onApprove={(comment: string) => approveMutation.mutate({
                      requestId: approval.id,
                      approved: true,
                      reviewer: 'admin@company.com',
                      comment,
                    })}
                    onReject={(comment: string) => approveMutation.mutate({
                      requestId: approval.id,
                      approved: false,
                      reviewer: 'admin@company.com',
                      comment,
                    })}
                    isMutating={approveMutation.isPending}
                  />
                ))
              )}
            </div>
          )}

          {selectedTab === 'recent' && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 animate-pulse">
                      <div className="h-5 w-3/4 bg-gray-600 rounded mb-2" />
                      <div className="h-4 w-1/2 bg-gray-600 rounded" />
                    </div>
                  ))}
                </div>
              ) : recentApprovals.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-xl rounded-xl p-8 text-center">
                  <p className="text-gray-400">No recent approvals</p>
                </div>
              ) : (
                recentApprovals.map((approval: any, index: number) => (
                  <RecentApprovalCard key={approval.id} approval={approval} index={index} />
                ))
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}

function PendingApprovalCard({ 
  approval, 
  index, 
  onApprove, 
  onReject,
  isMutating 
}: { 
  approval: any; 
  index: number;
  onApprove: (comment: string) => void;
  onReject: (comment: string) => void;
  isMutating: boolean;
}) {
  const [comment, setComment] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const handleApprove = () => {
    setIsApproving(true)
    onApprove(comment)
  }

  const handleReject = () => {
    setIsRejecting(true)
    onReject(comment)
  }

  const risk = approval.result?.risk
  const riskLevel = risk?.overallRisk || 'MEDIUM'
  const riskScore = risk?.score || 50
  const impact = approval.result?.impact

  // Determine safety assessment
  const isSafe = riskLevel === 'LOW' && (riskScore < 30)
  const needsReview = riskLevel === 'MEDIUM' || (riskScore >= 30 && riskScore < 60)
  const isHighRisk = riskLevel === 'HIGH' || riskLevel === 'CRITICAL' || riskScore >= 60

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.05 }}
      className="bg-white/5 backdrop-blur-xl rounded-xl p-6"
    >
      {/* Safety Assessment - Is it Safe? */}
      <div className={cn(
        'rounded-lg p-4 mb-4 border',
        isSafe && 'bg-green-500/10 border-green-500/20',
        needsReview && 'bg-yellow-500/10 border-yellow-500/20',
        isHighRisk && 'bg-red-500/10 border-red-500/20'
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isSafe && <CheckCircle className="h-5 w-5 text-green-500" />}
            {needsReview && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
            {isHighRisk && <AlertTriangle className="h-5 w-5 text-red-500" />}
            <span className="text-lg font-semibold text-white">Is it Safe?</span>
          </div>
          <span className={cn(
            'px-3 py-1 rounded-lg text-sm font-bold',
            isSafe && 'bg-green-500 text-white',
            needsReview && 'bg-yellow-500 text-white',
            isHighRisk && 'bg-red-500 text-white'
          )}>
            {isSafe ? 'SAFE TO APPROVE' : needsReview ? 'NEEDS REVIEW' : 'HIGH RISK'}
          </span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-gray-300">
            <span>Risk Level</span>
            <span className={cn('font-medium', getRiskBgColor(riskLevel as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'))}>
              {riskLevel} ({riskScore}/100)
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-300">
            <span>Columns Affected</span>
            <span className="font-medium">{approval.result?.plan?.affectedColumns?.length || 0}</span>
          </div>
          <div className="flex items-center justify-between text-gray-300">
            <span>Downstream Impact</span>
            <span className="font-medium">{impact?.affectedAssets?.length || 0} assets</span>
          </div>
          <div className="flex items-center justify-between text-gray-300">
            <span>Requires Manual Approval</span>
            <span className={cn('font-medium', approval.result?.plan?.requiresApproval ? 'text-red-400' : 'text-green-400')}>
              {approval.result?.plan?.requiresApproval ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">{approval.request?.description || 'Unknown request'}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Requested by {approval.request?.requestedBy || 'Unknown'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(approval.createdAt)}
            </span>
          </div>
        </div>
        <div className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', getRiskBgColor(riskLevel as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'))}>
          {riskLevel} ({riskScore})
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg mb-4">
        <User className="h-4 w-4 text-gray-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-white">Assigned to admin@company.com</p>
          <p className="text-xs text-gray-400">You are the designated reviewer</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium mb-2 block text-white">Comment (required for rejection)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add your review notes..."
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[80px] text-white placeholder:text-gray-500"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleApprove}
          disabled={isApproving || isRejecting || isMutating}
          className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isApproving ? (
            <>
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Approving...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Approve
            </>
          )}
        </button>
        
        <button
          onClick={handleReject}
          disabled={isApproving || isRejecting || isMutating}
          className="flex-1 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isRejecting ? (
            <>
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Rejecting...
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4" />
              Reject
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}

function RecentApprovalCard({ approval, index }: { approval: any; index: number }) {
  const risk = approval.result?.risk
  const riskLevel = risk?.overallRisk || 'MEDIUM'
  const riskScore = risk?.score || 50

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.05 }}
      className="bg-white/5 backdrop-blur-xl rounded-xl p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">{approval.request?.description || 'Unknown request'}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Requested by {approval.request?.requestedBy || 'Unknown'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatRelativeTime(approval.createdAt)}
            </span>
          </div>
        </div>
        <div className={cn(
          'px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2',
          approval.status === 'approved' && 'bg-green-500/10 text-green-500',
          approval.status === 'rejected' && 'bg-red-500/10 text-red-500'
        )}>
          {approval.status === 'approved' && <CheckCircle className="h-4 w-4" />}
          {approval.status === 'rejected' && <XCircle className="h-4 w-4" />}
          {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
        </div>
      </div>

      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
        <div className="flex items-center gap-3">
          <User className="h-4 w-4 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-white">Reviewed by {approval.approval?.reviewer || 'Unknown'}</p>
            <p className="text-xs text-gray-400">{formatRelativeTime(approval.createdAt)}</p>
          </div>
        </div>
        <div className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', getRiskBgColor(riskLevel as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'))}>
          {riskLevel} ({riskScore})
        </div>
      </div>

      {approval.approval?.comment && (
        <div className="mt-4 p-3 bg-white/5 rounded-lg flex items-start gap-3">
          <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
          <p className="text-sm text-gray-400">{approval.approval.comment}</p>
        </div>
      )}
    </motion.div>
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
