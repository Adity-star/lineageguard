import { PrismaClient, IdempotencyStatus } from "@prisma/client";
import { logger } from "../config/logger.js";
import { AppError } from "./errors.js";
import { MetricsSink, NoopMetricsSink, IdempotencyMetrics } from "./idempotency-metrics.js";

/**
 * Idempotency configuration options
 */
export interface IdempotencyOptions {
  /**
   * Unique key for the operation (typically provided by client or derived from inputs)
   */
  key: string;

  /**
   * Operation type/category for scoping
   */
  operationType: string;

  /**
   * Tenant ID for multi-tenant isolation
   */
  tenantId?: string;

  /**
   * Maximum age of idempotency records in seconds (if not supplied, defaults to operation-type default or 24 hours)
   */
  maxAgeSeconds?: number;
}

/**
 * Result of an idempotency check
 */
export interface IdempotencyResult<T = any> {
  /**
   * Whether this is a duplicate request
   */
  isDuplicate: boolean;

  /**
   * Cached result from previous execution (if duplicate and status is COMPLETED)
   */
  cachedResult?: T;

  /**
   * ID of the idempotency record
   */
  recordId?: string;

  /**
   * The status of the idempotency record: PENDING, COMPLETED, or FAILED
   */
  status?: IdempotencyStatus;
}

/**
 * Error thrown when idempotency check fails
 */
export class IdempotencyError extends AppError {
  constructor(message: string) {
    super(message, "IDEMPOTENCY_ERROR", 409);
  }
}

/**
 * Operation types for idempotency scoping
 */
export const OperationType = {
  WORKFLOW_EXECUTION: "workflow_execution",
  CONTEXT_BUILD: "context_build",
  PLANNING: "planning",
  RISK_ASSESSMENT: "risk_assessment",
  GENERATION: "generation",
  IMPACT_WRITEBACK: "impact_writeback",
  APPROVAL_DECISION: "approval_decision",
  GITHUB_PR_CREATION: "github_pr_creation",
  METADATA_WRITEBACK: "metadata_writeback",
  CHANGE_REQUEST: "change_request",
} as const;

export type OperationType = typeof OperationType[keyof typeof OperationType];

/**
 * Default TTLs in seconds per operation type
 */
export const DEFAULT_TTL_SECONDS: Record<string, number> = {
  [OperationType.WORKFLOW_EXECUTION]: 86400, // 24 hours
  [OperationType.CONTEXT_BUILD]: 3600,       // 1 hour
  [OperationType.PLANNING]: 21600,          // 6 hours
  [OperationType.RISK_ASSESSMENT]: 21600,    // 6 hours
  [OperationType.GENERATION]: 86400,         // 24 hours
  [OperationType.IMPACT_WRITEBACK]: 43200,   // 12 hours
  [OperationType.APPROVAL_DECISION]: 172800, // 48 hours
  [OperationType.GITHUB_PR_CREATION]: 604800, // 7 days
  [OperationType.METADATA_WRITEBACK]: 43200,  // 12 hours
  [OperationType.CHANGE_REQUEST]: 86400,     // 24 hours
};

/**
 * Database-backed Idempotency Service for preventing duplicate operations
 * using Prisma client instead of process-local state.
 */
export class IdempotencyService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly metrics: MetricsSink = new NoopMetricsSink(),
    private readonly pendingTimeoutMinutes = 10
  ) {}

  /**
   * Check if an operation has already been executed or is currently execution.
   * If it does not exist, claims the slot as 'PENDING'.
   * 
   * Returns:
   * - isDuplicate: true + cachedResult (if COMPLETED)
   * - isDuplicate: true + status PENDING (if another execution is currently running within timeout)
   * - isDuplicate: false (if clean slot claimed successfully)
   */
  async check<T>(options: IdempotencyOptions): Promise<IdempotencyResult<T>> {
    const startTime = Date.now();
    const ttl = options.maxAgeSeconds || DEFAULT_TTL_SECONDS[options.operationType] || 86400;
    const expiresAt = new Date(startTime + ttl * 1000);

    logger.debug({
      event: "idempotency_check_started",
      key: options.key,
      operationType: options.operationType,
      tenantId: options.tenantId,
    }, "Idempotency check started");

    try {
      // 1. Transaction 1: Try to claim slot by inserting a PENDING record.
      // If unique constraint fails, we read the existing record.
      const record = await this.prisma.$transaction(async (tx) => {
        // Look for existing record first to check expiration or stale PENDING state
        const existing = await tx.idempotencyRecord.findUnique({
          where: {
            operationType_tenantId_key: {
              operationType: options.operationType,
              tenantId: options.tenantId || "default",
              key: options.key,
            },
          },
        });

        if (existing) {
          const now = new Date();

          // Check if record is expired
          if (now > existing.expiresAt) {
            // Delete the expired record so we can claim a new one
            await tx.idempotencyRecord.delete({
              where: { id: existing.id },
            });
            logger.info({
              event: "idempotency_expired",
              key: options.key,
              operationType: options.operationType,
            }, "Expired idempotency record deleted");
            this.metrics.increment(IdempotencyMetrics.cacheMiss);
            return null; // Return null so we can create a new record in transaction 2 or outside
          }

          // Check if PENDING is stale (crashed worker)
          if (existing.status === IdempotencyStatus.PENDING) {
            const pendingAgeMs = now.getTime() - existing.createdAt.getTime();
            const maxPendingMs = this.pendingTimeoutMinutes * 60 * 1000;

            if (pendingAgeMs > maxPendingMs) {
              // Stale PENDING record detected. Overwrite/release it.
              logger.warn({
                event: "idempotency_pending_stale",
                key: options.key,
                operationType: options.operationType,
                recordId: existing.id,
                ageMinutes: Math.round(pendingAgeMs / 60000),
              }, "Stale PENDING idempotency record detected, releasing slot");
              
              const updated = await tx.idempotencyRecord.update({
                where: { id: existing.id },
                data: {
                  status: IdempotencyStatus.PENDING,
                  createdAt: now,
                  expiresAt,
                  result: null as any,
                },
              });
              this.metrics.increment(IdempotencyMetrics.pendingTimeout);
              return updated;
            }
          }

          return existing;
        }

        // Clean insert of new PENDING record
        const created = await tx.idempotencyRecord.create({
          data: {
            key: options.key,
            operationType: options.operationType,
            tenantId: options.tenantId || "default",
            status: IdempotencyStatus.PENDING,
            expiresAt,
          },
        });
        return created;
      });

      const lookupDuration = Date.now() - startTime;
      this.metrics.histogram(IdempotencyMetrics.lookupLatencyMs, lookupDuration);

      if (!record) {
        // Re-executing because the old one expired and was deleted in the transaction.
        // We will create the PENDING record now.
        const created = await this.prisma.idempotencyRecord.create({
          data: {
            key: options.key,
            operationType: options.operationType,
            tenantId: options.tenantId || "default",
            status: IdempotencyStatus.PENDING,
            expiresAt,
          },
        });
        
        logger.info({
          event: "idempotency_miss",
          key: options.key,
          operationType: options.operationType,
          recordId: created.id,
        }, "Idempotency miss: new slot claimed");

        return { isDuplicate: false, recordId: created.id, status: IdempotencyStatus.PENDING };
      }

      // If we got the record back and it was newly created by our transaction
      if (record.createdAt.getTime() >= startTime) {
        logger.info({
          event: "idempotency_record_created",
          key: options.key,
          operationType: options.operationType,
          recordId: record.id,
        }, "Idempotency record slot claimed");
        this.metrics.increment(IdempotencyMetrics.cacheMiss);
        return { isDuplicate: false, recordId: record.id, status: IdempotencyStatus.PENDING };
      }

      // Existing active record found (duplicate detection)
      logger.info({
        event: "idempotency_hit",
        key: options.key,
        operationType: options.operationType,
        recordId: record.id,
        status: record.status,
      }, "Duplicate operation detected via idempotency record");

      this.metrics.increment(IdempotencyMetrics.cacheHit);
      this.metrics.increment(IdempotencyMetrics.duplicatePrevented);

      return {
        isDuplicate: true,
        cachedResult: record.result as T,
        recordId: record.id,
        status: record.status,
      };

    } catch (error: any) {
      // Catch unique key constraint violation (P2002) in case of concurrent create calls outside check-transaction block
      if (error.code === "P2002") {
        this.metrics.increment(IdempotencyMetrics.uniqueConflict);
        logger.info({
          event: "idempotency_unique_conflict",
          key: options.key,
          operationType: options.operationType,
        }, "Concurrent unique key conflict resolved, returning duplicate = true");

        // Fetch the winner's record
        const record = await this.prisma.idempotencyRecord.findUnique({
          where: {
            operationType_tenantId_key: {
              operationType: options.operationType,
              tenantId: options.tenantId || "default",
              key: options.key,
            },
          },
        });

        return {
          isDuplicate: true,
          cachedResult: record?.result as T,
          recordId: record?.id ?? undefined,
          status: record?.status ?? undefined,
        };
      }

      throw error;
    }
  }

  /**
   * Record a successful operation result, moving status to COMPLETED
   */
  async record<T>(
    options: IdempotencyOptions,
    result: T,
    entityId?: string
  ): Promise<string> {
    const startTime = Date.now();
    const ttl = options.maxAgeSeconds || DEFAULT_TTL_SECONDS[options.operationType] || 86400;
    const expiresAt = new Date(startTime + ttl * 1000);

    const record = await this.prisma.idempotencyRecord.upsert({
      where: {
        operationType_tenantId_key: {
          operationType: options.operationType,
          tenantId: options.tenantId || "default",
          key: options.key,
        },
      },
      update: {
        status: IdempotencyStatus.COMPLETED,
        result: result as any,
        expiresAt,
        entityId: entityId ?? null,
      },
      create: {
        key: options.key,
        operationType: options.operationType,
        tenantId: options.tenantId || "default",
        status: IdempotencyStatus.COMPLETED,
        result: result as any,
        expiresAt,
        entityId: entityId ?? null,
      },
    });

    const duration = Date.now() - startTime;
    this.metrics.histogram(IdempotencyMetrics.recordLatencyMs, duration);

    logger.info({
      event: "idempotency_record_completed",
      key: options.key,
      operationType: options.operationType,
      recordId: record.id,
      entityId,
    }, "Operation result recorded for idempotency");

    return record.id;
  }

  /**
   * Release an idempotency record on operation failure by setting status to FAILED (or deleting it)
   */
  async invalidate(options: IdempotencyOptions): Promise<boolean> {
    try {
      await this.prisma.idempotencyRecord.update({
        where: {
          operationType_tenantId_key: {
            operationType: options.operationType,
            tenantId: options.tenantId || "default",
            key: options.key,
          },
        },
        data: {
          status: IdempotencyStatus.FAILED,
        },
      });

      logger.info({
        event: "idempotency_record_failed",
        key: options.key,
        operationType: options.operationType,
      }, "Idempotency record marked as FAILED");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a deterministic idempotency key from request parameters
   */
  static generateKey(params: Record<string, any>): string {
    const sorted = Object.keys(params)
      .sort()
      .map(key => {
        const val = params[key];
        return `${key}:${typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)}`;
      })
      .join('|');
    
    return Buffer.from(sorted).toString('base64');
  }
}

/**
 * Wrapper function to execute an operation with idempotency
 */
export async function withIdempotency<T>(
  options: IdempotencyOptions,
  operation: () => Promise<T>,
  service: IdempotencyService,
  entityIdExtractor?: (result: T) => string | undefined
): Promise<T> {
  const checkResult = await service.check<T>(options);
  
  if (checkResult.isDuplicate) {
    if (checkResult.status === IdempotencyStatus.COMPLETED && checkResult.cachedResult !== undefined) {
      logger.info({
        event: "idempotency_cache_hit",
        key: options.key,
        operationType: options.operationType,
      }, "Returning cached result from idempotency check");
      return checkResult.cachedResult;
    }

    if (checkResult.status === IdempotencyStatus.PENDING) {
      throw new IdempotencyError(
        `Another execution is currently running for this operation with key: ${options.key}`
      );
    }
  }

  try {
    const result = await operation();
    const entityId = entityIdExtractor ? entityIdExtractor(result) : undefined;
    await service.record(options, result, entityId);
    return result;
  } catch (error) {
    await service.invalidate(options);
    throw error;
  }
}
