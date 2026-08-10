-- LineageGuard Migration Script
-- Dataset: SampleHdfsDataset
-- Operation: add_column
-- Risk Level: LOW
-- Risk Score: 20/100
-- Approval Status: PENDING
-- Generated at: 2026-08-10T17:11:42.297Z
-- Run ID: intent
--
ALTER TABLE "SampleHdfsDataset" ADD COLUMN "customer_segment" VARCHAR(256) NULL;