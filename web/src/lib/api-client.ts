import type {
  ChangeRequest,
  WorkflowState,
  ApiResponse,
  Metrics,
  ApprovalDecision,
  Dataset,
} from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.request('/health')
  }

  // Submit a new schema change request
  async submitRequest(request: ChangeRequest): Promise<ApiResponse<WorkflowState>> {
    return this.request('/api/v1/requests', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Get request status by ID
  async getRequest(id: string): Promise<ApiResponse<WorkflowState>> {
    return this.request(`/api/v1/requests/${id}`)
  }

  // List all requests
  async listRequests(params?: {
    status?: string
    limit?: number
    offset?: number
  }): Promise<ApiResponse<WorkflowState[]>> {
    const queryString = new URLSearchParams(params as any).toString()
    return this.request(`/api/v1/requests${queryString ? `?${queryString}` : ''}`)
  }

  // Get metrics
  async getMetrics(): Promise<ApiResponse<Metrics>> {
    return this.request('/api/v1/metrics')
  }

  // Approve or reject a request
  async decideApproval(
    requestId: string,
    decision: ApprovalDecision
  ): Promise<ApiResponse<WorkflowState>> {
    return this.request(`/api/v1/requests/${requestId}/approval`, {
      method: 'POST',
      body: JSON.stringify(decision),
    })
  }

  // List datasets from DataHub
  async listDatasets(params?: {
    search?: string
    platform?: string
    limit?: number
  }): Promise<ApiResponse<Dataset[]>> {
    const queryString = new URLSearchParams(params as any).toString()
    return this.request(`/api/v1/datasets${queryString ? `?${queryString}` : ''}`)
  }

  // Get dataset details
  async getDataset(urn: string): Promise<ApiResponse<Dataset>> {
    return this.request(`/api/v1/datasets/${encodeURIComponent(urn)}`)
  }

  // List pull requests
  async listPullRequests(params?: {
    status?: string
    limit?: number
  }): Promise<ApiResponse<any[]>> {
    const queryString = new URLSearchParams(params as any).toString()
    return this.request(`/api/v1/pull-requests${queryString ? `?${queryString}` : ''}`)
  }

  // Get pull request details
  async getPullRequest(number: number): Promise<ApiResponse<any>> {
    return this.request(`/api/v1/pull-requests/${number}`)
  }
}

export const apiClient = new ApiClient()
