export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type RequestStatus = 'pending' | 'running' | 'waiting' | 'completed' | 'rejected' | 'failed'
export type Priority = 'low' | 'medium' | 'high'
export type PipelineStage = 'context' | 'planning' | 'risk' | 'generation' | 'impact' | 'approval' | 'github'

export interface ChangeRequest {
  description: string
  datasetUrn?: string
  requestedBy: string
  priority?: Priority
}

export interface WorkflowState {
  request: ChangeRequest
  context?: any
  plan?: any
  risk?: RiskAssessment
  generation?: any
  impact?: ImpactReport
  approval?: ApprovalRequest
  github?: any
  status?: RequestStatus
  error?: string
  createdAt: string
  updatedAt: string
}

export interface RiskAssessment {
  overallRisk: RiskLevel
  score: number
  factors: RiskFactor[]
  recommendations: string[]
}

export interface RiskFactor {
  category: string
  level: RiskLevel
  description: string
}

export interface ImpactReport {
  summary: string
  score: number
  level: RiskLevel
  requiresApproval: boolean
  affectedColumns: string[]
  affectedAssets: AffectedAsset[]
  recommendations: Recommendation[]
  triggeredRules?: string[]
}

export interface AffectedAsset {
  urn: string
  name: string
  type: 'dataset' | 'dashboard' | 'model' | 'pipeline'
  impact: RiskLevel
  description?: string
}

export interface Recommendation {
  title: string
  description: string
  priority: Priority
}

export interface ApprovalRequest {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  requestedBy: string
  reviewer: string
  riskLevel: RiskLevel
  riskScore: number
  createdAt: string
  updatedAt: string
}

export interface ApprovalDecision {
  approved: boolean
  reviewer: string
  comment?: string
  decidedAt: string
}

export interface GenerationResult {
  schema: string
  formatted: string
  sql: string
  markdown: string
}

export interface PullRequest {
  number: number
  title: string
  body: string
  branch: string
  base: string
  status: 'open' | 'closed' | 'merged'
  url: string
  createdAt: string
  mergedAt?: string
}

export interface Dataset {
  urn: string
  name: string
  platform: string
  description?: string
  owners: { urn: string; name: string; type: string }[]
  tags: string[]
  glossaryTerms: string[]
  domain?: string
  lastModified?: string
}

export interface Metrics {
  schemaChanges: number
  pendingReviews: number
  criticalChanges: number
  autoApproved: number
  prsCreated: number
  avgRiskScore: number
  avgReviewTime: number
}

export interface ApiResponse<T> {
  status: 'success' | 'error'
  data?: T
  error?: string
  message?: string
}
