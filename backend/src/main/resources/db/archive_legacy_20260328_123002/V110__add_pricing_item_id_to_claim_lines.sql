-- ============================================================
-- V110: Add pricing_item_id to claim_lines
--
-- This column is required to support unmapped services
-- that are directly linked to a provider contract pricing item.
-- ============================================================

ALTER TABLE claim_lines
    ADD COLUMN IF NOT EXISTS pricing_item_id BIGINT;

-- Add index for performance in contract-related queries
CREATE INDEX IF NOT EXISTS idx_claim_line_pricing_item ON claim_lines (pricing_item_id);
