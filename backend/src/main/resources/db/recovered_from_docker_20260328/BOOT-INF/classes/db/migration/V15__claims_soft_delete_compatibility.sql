-- V15__claims_soft_delete_compatibility.sql
-- Restores legacy soft-delete metadata fields expected by runtime queries.

ALTER TABLE claims
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
    ADD COLUMN IF NOT EXISTS full_coverage BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_claims_deleted_at ON claims (deleted_at);
CREATE INDEX IF NOT EXISTS idx_claims_active_deleted ON claims (active, deleted_at DESC);
