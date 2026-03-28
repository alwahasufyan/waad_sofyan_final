-- V22: Members/Documents/Taxonomy runtime compatibility
-- Fixes:
-- 1) /api/v1/provider-contracts/{id}/pricing expects medical_service_categories.active
-- 2) /api/v1/unified-members inserts do not provide members.member_card_id
-- 3) /api/v1/providers/{id}/documents inserts file_name while legacy schema may enforce document_name NOT NULL

-- 1) Ensure medical_service_categories.active exists and is usable by runtime queries
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'medical_service_categories'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'medical_service_categories'
          AND column_name = 'active'
    ) THEN
        ALTER TABLE medical_service_categories
            ADD COLUMN active BOOLEAN;

        UPDATE medical_service_categories
        SET active = TRUE
        WHERE active IS NULL;

        ALTER TABLE medical_service_categories
            ALTER COLUMN active SET DEFAULT TRUE,
            ALTER COLUMN active SET NOT NULL;
    ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'medical_service_categories'
          AND column_name = 'active'
    ) THEN
        UPDATE medical_service_categories
        SET active = TRUE
        WHERE active IS NULL;

        ALTER TABLE medical_service_categories
            ALTER COLUMN active SET DEFAULT TRUE,
            ALTER COLUMN active SET NOT NULL;
    END IF;
END $$;

-- 4) Compatibility shim for legacy JDBC bindings that may call lower(bytea)
--    during import identity matching on some runtime paths.
CREATE OR REPLACE FUNCTION public.lower(bytea)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT pg_catalog.lower(convert_from($1, 'UTF8'))
$$;

CREATE INDEX IF NOT EXISTS idx_medical_service_categories_service_active
    ON medical_service_categories(service_id, active);

-- 2) Relax members.member_card_id for current unified-member runtime insert shape
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'members'
          AND column_name = 'member_card_id'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE members
            ALTER COLUMN member_card_id DROP NOT NULL;
    END IF;
END $$;

-- 3) Backfill/relax provider_admin_documents.document_name to align with entity using file_name
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'provider_admin_documents'
          AND column_name = 'document_name'
    ) THEN
        UPDATE provider_admin_documents
        SET document_name = COALESCE(NULLIF(document_name, ''), file_name, document_number, type)
        WHERE document_name IS NULL OR document_name = '';

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'provider_admin_documents'
              AND column_name = 'document_name'
              AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE provider_admin_documents
                ALTER COLUMN document_name DROP NOT NULL;
        END IF;
    END IF;
END $$;
