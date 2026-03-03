-- Migration: V109__add_backlog_support.sql
-- Description: Add support for backlog (legacy) claims and visits

-- 1. Add network_status to visits
ALTER TABLE visits ADD COLUMN IF NOT EXISTS network_status VARCHAR(30) DEFAULT 'IN_NETWORK';

-- 2. Add backlog fields to claims
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claim_source VARCHAR(30);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS legacy_reference_number VARCHAR(100);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS is_backlog BOOLEAN DEFAULT FALSE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS entered_at TIMESTAMP;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS entered_by VARCHAR(255);

-- 3. Add Unique Constraint to prevent duplicates for backlog claims
-- We use a unique index with a WHERE clause to only enforce it for legacy claims
-- If it already exists, this might fail, so we check first if possible or just let it be.
-- In PostgreSQL, we can use DROP INDEX IF EXISTS then CREATE.
DROP INDEX IF EXISTS idx_unique_legacy_claim;
CREATE UNIQUE INDEX idx_unique_legacy_claim ON claims (provider_id, legacy_reference_number) 
WHERE legacy_reference_number IS NOT NULL;

-- 4. Add index for performance when filtering backlog claims
CREATE INDEX IF NOT EXISTS idx_claims_is_backlog ON claims (is_backlog);
CREATE INDEX IF NOT EXISTS idx_claims_source ON claims (claim_source);
