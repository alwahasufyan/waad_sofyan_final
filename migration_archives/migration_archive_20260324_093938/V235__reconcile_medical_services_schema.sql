ALTER TABLE medical_services
    ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS specialty_id BIGINT,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

UPDATE medical_services
SET base_price = COALESCE(base_price, cost, 0)
WHERE base_price IS NULL;

UPDATE medical_services
SET status = CASE
    WHEN COALESCE(active, false) = true THEN 'ACTIVE'
    ELSE 'DRAFT'
END
WHERE status IS NULL OR status = '';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'medical_services'
          AND constraint_name = 'fk_medical_service_specialty'
    ) THEN
        ALTER TABLE medical_services
            ADD CONSTRAINT fk_medical_service_specialty
            FOREIGN KEY (specialty_id) REFERENCES medical_specialties(id)
            ON DELETE SET NULL;
    END IF;
END $$;