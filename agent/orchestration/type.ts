import { GitHubResult } from '../github/github-engine.js';
import { ChangeRequest } from '../mcp/types.js';
import { ApprovalDecision } from '../approval/types.js';
import { ApprovalRequest } from '../approval/types.js';
import { PerformanceMetrics } from '../utils/performance.js';
import { ContextBundle } from '../context/type.js';
import { ExecutionPlan } from '../planner/types.js';
import { RiskAssessment } from '../risk/types.js';
import { GenerationResult } from '../generators/types.js';
import { ImpactReport } from '../impact/types.js';

export interface WorkflowState {
  request?: ChangeRequest;

  context?: ContextBundle;

  plan?: ExecutionPlan;

  risk?: RiskAssessment;

  generation?: GenerationResult;

  impact?: ImpactReport;

  approval?: ApprovalDecision;

  approvalRequest?: ApprovalRequest;

  github?: GitHubResult;

  performance?: PerformanceMetrics;

  runId?: string;

  database?: any;

  documentation?: any;
}
