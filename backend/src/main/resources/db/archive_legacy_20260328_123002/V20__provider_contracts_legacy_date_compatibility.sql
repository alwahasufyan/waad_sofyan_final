-- V20__provider_contracts_legacy_date_compatibility.sql
-- Align legacy date columns with ModernProviderContract insert shape.

UPDATE provider_contracts
SET
    contract_start_date = COALESCE(contract_start_date, start_date, CURRENT_DATE),
    contract_end_date = COALESCE(contract_end_date, end_date)
WHERE contract_start_date IS NULL OR (contract_end_date IS NULL AND end_date IS NOT NULL);

ALTER TABLE provider_contracts
    ALTER COLUMN contract_start_date DROP NOT NULL,
    ALTER COLUMN contract_start_date SET DEFAULT CURRENT_DATE;
