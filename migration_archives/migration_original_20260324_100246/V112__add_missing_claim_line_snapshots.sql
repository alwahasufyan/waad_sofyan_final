-- ============================================================
-- V112: Add missing coverage snapshots to claim_lines
-- ============================================================

ALTER TABLE claim_lines
ADD COLUMN IF NOT EXISTS benefit_limit NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS used_amount_snapshot NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS remaining_amount_snapshot NUMERIC(15,2);

-- COMMENT: These fields were added to the ClaimLine entity but missed in previous migrations.
-- They are used for point-in-time audit of benefit consumption relative to limits.
