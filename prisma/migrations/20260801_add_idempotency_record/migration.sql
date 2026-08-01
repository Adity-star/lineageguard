-- Migration: add_idempotency_record
-- Creates the central IdempotencyRecord table that replaces all in-memory
-- Map() state in IdempotencyService. The composite unique index is the
-- database-level atomic race guard for concurrent duplicate detection.

-- IdempotencyStatus enum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- Central idempotency record table
CREATE TABLE "IdempotencyRecord" (
    "id"            TEXT NOT NULL,
    "key"           TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "tenantId"      TEXT,
    "entityId"      TEXT,
    "result"        JSONB,
    "status"        "IdempotencyStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt"     TIMESTAMP(3) NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- Composite unique: the atomic guard that makes duplicate inserts fail
-- Works identically across any number of horizontally-scaled instances
CREATE UNIQUE INDEX "IdempotencyRecord_composite_key"
    ON "IdempotencyRecord"("operationType", "tenantId", "key");

-- Fast lookup for check() calls
CREATE INDEX "IdempotencyRecord_lookup_idx"
    ON "IdempotencyRecord"("operationType", "tenantId", "key");

-- Efficient cleanup scans (deleteMany where expiresAt < cutoff)
CREATE INDEX "IdempotencyRecord_expiresAt_idx"
    ON "IdempotencyRecord"("expiresAt");

-- Filter PENDING records during stale-slot recovery
CREATE INDEX "IdempotencyRecord_status_idx"
    ON "IdempotencyRecord"("status");
