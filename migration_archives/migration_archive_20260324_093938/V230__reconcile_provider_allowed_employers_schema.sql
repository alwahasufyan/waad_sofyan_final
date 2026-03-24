-- Reconcile legacy provider_allowed_employers layout with the current entity.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'provider_allowed_employers'
    ) THEN
        ALTER TABLE provider_allowed_employers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
        ALTER TABLE provider_allowed_employers ADD COLUMN IF NOT EXISTS notes VARCHAR(500);

        UPDATE provider_allowed_employers
        SET active = TRUE
        WHERE active IS NULL;

        ALTER TABLE provider_allowed_employers ALTER COLUMN active SET DEFAULT TRUE;
        ALTER TABLE provider_allowed_employers ALTER COLUMN active SET NOT NULL;

        CREATE INDEX IF NOT EXISTS idx_pae_active ON provider_allowed_employers(active);
    END IF;
END $$;