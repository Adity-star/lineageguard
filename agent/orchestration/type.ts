import { ChangeRequest } from "@/mcp";
import { ContextBundle } from "@/context";
import { ExecutionPlan } from "@/planning";
import { RiskAssessment } from "@/risk";
import { GenerationResult } from "@/generator";
import { ImpactReport } from "@/impact";

/**
 * Shared state passed through the entire pipeline.
 */
export interface WorkflowState {

  /**
   * Original user request parsed by the MCP layer.
   */
  request: ChangeRequest;

  /**
   * Metadata collected from DataHub.
   */
  context?: ContextBundle;

  /**
   * LLM-generated execution plan.
   */
  plan?: ExecutionPlan;

  /**
   * Deterministic risk assessment.
   */
  risk?: RiskAssessment;

  /**
   * Generated migration artifacts.
   */
  generation?: GenerationResult;

  /**
   * Final governance report written back
   * into DataHub.
   */
  impact?: ImpactReport;

}