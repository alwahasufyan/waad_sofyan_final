-- V17__claims_providers_policies_runtime_compatibility.sql
-- Runtime compatibility patch for claims list, provider creation, and benefit-policy creation.

-- ----------------------------------------------------------
-- claims runtime compatibility
-- ----------------------------------------------------------
-- Visit entity expects `visits.complaint`, and claims list joins visits with this column.
ALTER TABLE visits
    ADD COLUMN IF NOT EXISTS complaint VARCHAR(1000);

-- ----------------------------------------------------------
-- providers runtime compatibility
-- ----------------------------------------------------------
-- Modern Provider entity writes `name`, while some legacy schemas still enforce NOT NULL on `provider_name`.
UPDATE providers
SET provider_name = COALESCE(provider_name, name, provider_name_ar)
WHERE provider_name IS NULL;

ALTER TABLE providers
    ALTER COLUMN provider_name DROP NOT NULL;

-- ----------------------------------------------------------
-- benefit policies runtime compatibility
-- ----------------------------------------------------------
-- Modern BenefitPolicy entity writes `name`, while some legacy schemas still enforce NOT NULL on `policy_name`.
UPDATE benefit_policies
SET policy_name = COALESCE(policy_name, name)
WHERE policy_name IS NULL;

ALTER TABLE benefit_policies
    ALTER COLUMN policy_name DROP NOT NULL;
