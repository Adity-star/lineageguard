import { PrismaClient } from "@prisma/client";
import { logger } from "../config/logger.js";
import { MetricsSink, NoopMetricsSink, IdempotencyMetrics } from "./idempotency-metrics.js";

/**
 * Cleanup job for pruning expired idempotency records.
 * Keeps request latency predictable by offloading deletions to a scheduled background job.
 */
export class IdempotencyCleanupJob {
  private timer: NodeJS.Timeout | undefined = undefined;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly metrics: MetricsSink = new NoopMetricsSink()
  ) {}

  /**
   * Start the cleanup scheduler.
   *
   * @param intervalMs How often the cleanup task runs (default: 5 minutes)
   * @param retentionBufferHours Expired records linger for this long before hard-delete (default: 1 hour)
   */
  start(intervalMs = 300000, retentionBufferHours = 1): void {
    if (this.timer) {
      this.stop();
    }

    this.timer = setInterval(async () => {
      try {
        const cutoff = new Date(Date.now() - retentionBufferHours * 60 * 60 * 1000);
        const { count } = await this.prisma.idempotencyRecord.deleteMany({
          where: {
            expiresAt: {
              lt: cutoff,
            },
          },
        });

        if (count > 0) {
          logger.info(
            {
              event: "idempotency_cleanup_complete",
              deletedCount: count,
              cutoff,
            },
            "Idempotency expired records purged"
          );
          this.metrics.increment(IdempotencyMetrics.cleanupDeleted, count);
        }
      } catch (error) {
        logger.error(
          {
            event: "idempotency_cleanup_failed",
            error: error instanceof Error ? error.message : String(error),
          },
          "Failed to prune expired idempotency records"
        );
      }
    }, intervalMs);
  }

  /**
   * Stop the scheduled cleanup interval.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
