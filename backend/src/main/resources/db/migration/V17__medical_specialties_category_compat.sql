-- Compatibility migration for legacy databases that created medical_specialties
-- before category_id was introduced in later taxonomy revisions.

ALTER TABLE medical_specialties
    ADD COLUMN IF NOT EXISTS category_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_medical_specialties_category_id
    ON medical_specialties(category_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_medical_specialties_category'
    ) THEN
        ALTER TABLE medical_specialties
            ADD CONSTRAINT fk_medical_specialties_category
            FOREIGN KEY (category_id)
            REFERENCES medical_categories(id)
            ON DELETE SET NULL;
    END IF;
END $$;