ALTER TABLE medical_service_categories
    ADD COLUMN IF NOT EXISTS active BOOLEAN;

UPDATE medical_service_categories
SET active = TRUE
WHERE active IS NULL;

ALTER TABLE medical_service_categories
    ALTER COLUMN active SET DEFAULT TRUE;

ALTER TABLE medical_service_categories
    ALTER COLUMN active SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_msc_active
    ON medical_service_categories(active);