import { describe, it, expect } from 'vitest';
import { RiskScorer } from '../../../risk/scorer.js';
import { RiskMetrics } from '../../../risk/calculator.js';

describe('RiskScorer', () => {
  it('should calculate low risk for simple column addition', () => {
    const scorer = new RiskScorer();
    
    const metrics: RiskMetrics = {
      downstreamDatasets: 0,
      upstreamDatasets: 0,
      affectedColumns: 1,
      queryCount: 10,
      documentCount: 5,
      hasDocumentation: true,
      hasOwner: true,
      requiresApproval: false,
    };

    const result = scorer.score(metrics);

    expect(result.overallRisk).toBe('LOW');
    expect(result.score).toBeLessThan(30);
  });

  it('should calculate high risk for column deletion with downstream impact', () => {
    const scorer = new RiskScorer();
    
    const metrics: RiskMetrics = {
      downstreamDatasets: 25,
      upstreamDatasets: 5,
      affectedColumns: 1,
      queryCount: 1000,
      documentCount: 10,
      hasDocumentation: true,
      hasOwner: true,
      requiresApproval: false,
    };

    const result = scorer.score(metrics);

    expect(result.overallRisk).toBe('HIGH');
    expect(result.score).toBeGreaterThan(50);
  });

  it('should calculate critical risk for table deletion with massive downstream impact', () => {
    const scorer = new RiskScorer();
    
    const metrics: RiskMetrics = {
      downstreamDatasets: 50,
      upstreamDatasets: 15,
      affectedColumns: 10,
      queryCount: 10000,
      hasDocumentation: false,
      hasOwner: false,
      requiresApproval: true,
    };

    const result = scorer.score(metrics);

    expect(result.overallRisk).toBe('CRITICAL');
    expect(result.score).toBeGreaterThan(75);
  });

  it('should cap score at 100', () => {
    const scorer = new RiskScorer();
    
    const metrics: RiskMetrics = {
      downstreamDatasets: 100,
      upstreamDatasets: 100,
      affectedColumns: 100,
      queryCount: 100000,
      hasDocumentation: false,
      hasOwner: false,
      requiresApproval: true,
    };

    const result = scorer.score(metrics);

    expect(result.score).toBe(100);
    expect(result.overallRisk).toBe('CRITICAL');
  });
});
