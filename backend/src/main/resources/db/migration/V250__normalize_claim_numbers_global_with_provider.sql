-- ============================================================
-- V243: Normalize claim numbers to canonical global format
-- Format: CLM-{global_sequence_padded}-P{provider_id}
-- Example: CLM-00001234-P51
--
-- Rationale:
-- - Global sequential reference based on claim id
-- - Simple provider discriminator suffix for quick identification
-- ============================================================

UPDATE claims
SET claim_number = CONCAT('CLM-', LPAD(id::text, 8, '0'), '-P', COALESCE(provider_id::text, '0'))
WHERE claim_number IS NULL
   OR claim_number !~ '^CLM-[0-9]{8}-P[0-9]+$';
