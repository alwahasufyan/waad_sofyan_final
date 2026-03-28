-- V18__benefit_policies_effective_date_compatibility.sql
-- Ensure modern BenefitPolicy inserts are compatible with legacy effective_date column.

UPDATE benefit_policies
SET effective_date = COALESCE(effective_date, start_date, CURRENT_DATE)
WHERE effective_date IS NULL;

ALTER TABLE benefit_policies
    ALTER COLUMN effective_date DROP NOT NULL;
