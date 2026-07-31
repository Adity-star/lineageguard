import { GitHubResult } from "../github/github-engine.js";
import { ChangeRequest } from "../mcp/types.js";

export interface WorkflowState {

  request?: ChangeRequest;

  context?: any;

  plan?: any;

  risk?: any;

  generation?: any;

  impact?: any;

  github?: GitHubResult;

}