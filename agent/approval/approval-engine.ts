import { RiskAssessment } from '../risk/types.js';
import { ImpactReport } from '../impact/types.js';
import { ApprovalDecision, ApprovalRequest, ApprovalStatus } from './types.js';

export class ApprovalEngine {
  /**
   * Determines if a change requires manual approval based on risk level.
   * LOW risk changes can be auto-approved if configured.
   * MEDIUM, HIGH, and CRITICAL always require approval.
   */
  requiresApproval(risk: RiskAssessment, impact: ImpactReport): boolean {
    // Use the risk engine's requiresApproval as the primary source of truth
    // This is based on operation type, downstream impact, and configured policy
    if (risk.requiresApproval) {
      return true;
    }

    // If risk engine says no approval, but impact engine says yes, respect impact
    if (impact.requiresApproval) {
      return true;
    }

    // HIGH and CRITICAL always require approval as a safety net
    if (risk.overallRisk === 'HIGH' || risk.overallRisk === 'CRITICAL') {
      return true;
    }

    if (impact.level === 'HIGH' || impact.level === 'CRITICAL') {
      return true;
    }

    // MEDIUM requires approval by default (can be configured)
    if (risk.overallRisk === 'MEDIUM' || impact.level === 'MEDIUM') {
      return true;
    }

    // LOW risk can be auto-approved
    return false;
  }

  /**
   * Creates an approval request for manual review.
   */
  createApprovalRequest(
    requestId: string,
    risk: RiskAssessment,
    impact: ImpactReport,
    datasetName: string,
    changeDescription: string,
  ): ApprovalRequest {
    return {
      requestId,
      riskLevel: risk.overallRisk,
      riskScore: risk.score,
      requiresApproval: this.requiresApproval(risk, impact),
      context: {
        datasetName,
        changeDescription,
      },
    };
  }

  /**
   * Processes an approval decision.
   * This would typically be called via API when a human approves/rejects.
   */
  processDecision(
    decision: ApprovalStatus,
    reviewedBy: string,
    reason?: string,
  ): ApprovalDecision {
    // Only set reviewedAt for actual approvals/rejections, not for PENDING
    const reviewedAt =
      decision === 'APPROVED' || decision === 'REJECTED'
        ? new Date().toISOString()
        : undefined;

    return {
      status: decision,
      reviewedBy,
      reviewedAt,
      reason,
    };
  }

  /**
   * Validates that an approval decision is valid for the given risk level.
   * For example, HIGH/CRITICAL changes must have a reason provided.
   */
  validateDecision(
    decision: ApprovalDecision,
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  ): { valid: boolean; error?: string } {
    if (decision.status === 'APPROVED' && !decision.reviewedBy) {
      return {
        valid: false,
        error: 'Approved decisions must include reviewer information.',
      };
    }

    if (decision.status === 'REJECTED' && !decision.reason) {
      return {
        valid: false,
        error: 'Rejected decisions must include a reason.',
      };
    }

    if (
      (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') &&
      !decision.reason
    ) {
      return {
        valid: false,
        error:
          'HIGH and CRITICAL risk changes require a reason for the decision.',
      };
    }

    return { valid: true };
  }
}
