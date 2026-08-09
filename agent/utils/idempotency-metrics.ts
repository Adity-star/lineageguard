/**
 * Idempotency Metrics
 *
 * Named metric keys emitted by IdempotencyService at every check/record call.
 * Wire these into your preferred metrics sink (StatsD, Prometheus, CloudWatch)
 * via the MetricsSink interface — IdempotencyService accepts any implementation.
 */

export const IdempotencyMetrics = {
  /** Counter: check() returned isDuplicate=true and served a cached result */
  cacheHit: 'idempotency.cache.hit',

  /** Counter: check() found no record or an expired record — operation will run */
  cacheMiss: 'idempotency.cache.miss',

  /** Counter: a duplicate request was short-circuited before external API call */
  duplicatePrevented: 'idempotency.duplicate.prevented',

  /**
   * Counter: unique constraint violation (P2002) caught during record().
   * Indicates a race between two concurrent callers — benign, the loser discards its write.
   */
  uniqueConflict: 'idempotency.conflict.unique',

  /**
   * Counter: a PENDING record was found with createdAt older than PENDING_TIMEOUT.
   * Indicates the original process crashed before completing the operation.
   */
  pendingTimeout: 'idempotency.pending.timeout',

  /** Histogram (ms): time taken for a single check() DB lookup */
  lookupLatencyMs: 'idempotency.lookup.latency_ms',

  /** Histogram (ms): time taken for a record() DB write */
  recordLatencyMs: 'idempotency.record.latency_ms',

  /** Counter: number of expired records deleted in a single cleanup pass */
  cleanupDeleted: 'idempotency.cleanup.deleted',
} as const;

export type IdempotencyMetricKey =
  (typeof IdempotencyMetrics)[keyof typeof IdempotencyMetrics];

/**
 * Minimal metrics sink interface.
 * Implement this with your metrics library of choice and inject into IdempotencyService.
 */
export interface MetricsSink {
  increment(
    metric: string,
    value?: number,
    tags?: Record<string, string>,
  ): void;
  histogram(metric: string, value: number, tags?: Record<string, string>): void;
}

/**
 * No-op sink — used when no metrics backend is configured.
 */
export class NoopMetricsSink implements MetricsSink {
  increment(
    _metric: string,
    _value?: number,
    _tags?: Record<string, string>,
  ): void {}
  histogram(
    _metric: string,
    _value: number,
    _tags?: Record<string, string>,
  ): void {}
}
