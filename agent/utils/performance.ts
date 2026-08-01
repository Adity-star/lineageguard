export interface PerformanceMetrics {
  contextMs: number;
  planningMs: number;
  riskMs: number;
  generationMs: number;
  impactMs: number;
  approvalMs: number;
  githubMs: number;
  totalMs: number;
}

export class PerformanceTracker {
  private metrics: Map<string, number> = new Map();
  private startTime: number;

  constructor() {
    this.startTime = performance.now();
  }

  start(stage: string): void {
    this.metrics.set(`${stage}_start`, performance.now());
  }

  end(stage: string): number {
    const startKey = `${stage}_start`;
    const startTime = this.metrics.get(startKey);
    if (!startTime) {
      return 0;
    }
    const duration = performance.now() - startTime;
    this.metrics.set(`${stage}_ms`, duration);
    this.metrics.delete(startKey);
    return duration;
  }

  get(stage: string): number {
    return this.metrics.get(`${stage}_ms`) || 0;
  }

  getTotal(): number {
    return performance.now() - this.startTime;
  }

  getMetrics(): PerformanceMetrics {
    return {
      contextMs: this.get('context'),
      planningMs: this.get('planning'),
      riskMs: this.get('risk'),
      generationMs: this.get('generation'),
      impactMs: this.get('impact'),
      approvalMs: this.get('approval'),
      githubMs: this.get('github'),
      totalMs: this.getTotal(),
    };
  }
}
