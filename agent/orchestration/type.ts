import { GitHubResult } from "@/github";

export interface WorkflowState {

  request?: ChangeRequest;

  context?: ContextBundle;

  plan?: ExecutionPlan;

  risk?: RiskAssessment;

  generation?: GenerationResult;

  impact?: ImpactReport;

  github?: GitHubResult;

}