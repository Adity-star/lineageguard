-- LineageGuard Rollback Script
-- Dataset: SampleHdfsDataset
-- Operation: add_column
-- Automatic: Yes
-- Generated at: 2026-08-10T17:11:42.299Z
--
-- Affected columns: customer_segment

ALTER TABLE SampleHdfsDataset DROP COLUMN customer_segment;