import { GitHubResult } from "../github/github-engine.js";
import { ChangeRequest } from "../mcp/types.js";
import { ApprovalDecision } from "../approval/types.js";
import { ApprovalRequest } from "../approval/types.js";

export interface WorkflowState {

  request?: ChangeRequest;

  context?: any;

  plan?: any;

  risk?: any;

  generation?: any;

  impact?: any;

  approval?: ApprovalDecision;

  approvalRequest?: ApprovalRequest;

  github?: GitHubResult;

}