-- V21__member_barcode_and_pricing_unit_price_compatibility.sql
-- Runtime compatibility fixes for unified member barcode generation and
-- provider contract pricing item inserts.

-- ----------------------------------------------------------
-- 1) Ensure barcode sequence exists for BarcodeGeneratorService
-- ----------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS member_barcode_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    NO MAXVALUE
    CACHE 1;

DO $$
DECLARE
    v_max_suffix BIGINT;
BEGIN
    SELECT COALESCE(MAX((regexp_match(barcode, '^(?:WAHA|WAD)-\\d{4}-(\\d+)$'))[1]::BIGINT), 0)
      INTO v_max_suffix
      FROM members
     WHERE barcode IS NOT NULL
       AND barcode ~ '^(?:WAHA|WAD)-\\d{4}-\\d+$';

    -- Set next value safely above any existing barcode suffix.
    IF v_max_suffix > 0 THEN
        PERFORM setval('member_barcode_seq', v_max_suffix, true);
    ELSE
        PERFORM setval('member_barcode_seq', 1, false);
    END IF;
END $$;

-- ----------------------------------------------------------
-- 2) Keep legacy unit_price column compatible with modern inserts
-- ----------------------------------------------------------
ALTER TABLE provider_contract_pricing_items
    ALTER COLUMN unit_price SET DEFAULT 0;

UPDATE provider_contract_pricing_items
SET unit_price = COALESCE(unit_price, contract_price, base_price, 0)
WHERE unit_price IS NULL;
