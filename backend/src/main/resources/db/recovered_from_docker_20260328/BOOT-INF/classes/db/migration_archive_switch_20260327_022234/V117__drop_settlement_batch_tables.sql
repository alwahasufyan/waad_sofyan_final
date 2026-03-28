-- V117: Drop Settlement Batch system
-- The SettlementBatch feature has been removed. This migration cleans up the DB.

-- 1. Drop FK constraint from claims that references settlement_batches
ALTER TABLE claims DROP CONSTRAINT IF EXISTS fk_claim_settlement_batch;

-- 2. Remove FK and column from provider_payments
ALTER TABLE provider_payments DROP CONSTRAINT IF EXISTS fk_payment_batch;
ALTER TABLE provider_payments DROP CONSTRAINT IF EXISTS uq_payments_batch;
ALTER TABLE provider_payments DROP COLUMN IF EXISTS settlement_batch_id;

-- 3. Drop batch tables (items first due to FK dependency)
DROP TABLE IF EXISTS settlement_batch_items;
DROP TABLE IF EXISTS settlement_batches;

-- 4. Drop sequence
DROP SEQUENCE IF EXISTS settlement_batch_seq;

-- 5. Reset any BATCHED claims back to APPROVED
UPDATE claims SET status = 'APPROVED' WHERE status = 'BATCHED';

-- 6. Drop settlement_batch_id from claims if it exists
ALTER TABLE claims DROP COLUMN IF EXISTS settlement_batch_id;
