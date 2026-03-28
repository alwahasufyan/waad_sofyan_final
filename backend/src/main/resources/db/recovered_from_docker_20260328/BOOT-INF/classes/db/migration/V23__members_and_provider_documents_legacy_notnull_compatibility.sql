-- V23: members/provider_admin_documents legacy NOT NULL compatibility
-- Fixes:
-- 1) /api/v1/unified-members insert shape uses birth_date, while legacy schema may still require date_of_birth.
-- 2) /api/v1/providers/{id}/documents uses type/file_name/file_url, while legacy schema may still require
--    document_type/document_name/file_path NOT NULL.

-- ----------------------------------------------------------
-- members.date_of_birth compatibility
-- ----------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'members'
          AND column_name = 'date_of_birth'
    ) THEN
        -- Backfill from birth_date when possible.
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'members'
              AND column_name = 'birth_date'
        ) THEN
            UPDATE members
            SET date_of_birth = COALESCE(date_of_birth, birth_date)
            WHERE date_of_birth IS NULL;
        END IF;

        -- Relax legacy NOT NULL so modern inserts using birth_date succeed.
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'members'
              AND column_name = 'date_of_birth'
              AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE members
                ALTER COLUMN date_of_birth DROP NOT NULL;
        END IF;
    END IF;
END $$;

-- ----------------------------------------------------------
-- provider_admin_documents legacy columns compatibility
-- ----------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'provider_admin_documents'
    ) THEN
        -- Backfill legacy columns from modern ones to keep old/new schemas aligned.
        UPDATE provider_admin_documents
        SET document_type = COALESCE(document_type, type)
        WHERE document_type IS NULL;

        UPDATE provider_admin_documents
        SET document_name = COALESCE(document_name, file_name, document_number, type)
        WHERE document_name IS NULL;

        UPDATE provider_admin_documents
        SET file_path = COALESCE(file_path, file_url)
        WHERE file_path IS NULL;

        -- Relax legacy NOT NULL constraints that conflict with modern entity writes.
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'provider_admin_documents'
              AND column_name = 'document_type'
              AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE provider_admin_documents
                ALTER COLUMN document_type DROP NOT NULL;
        END IF;

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

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'provider_admin_documents'
              AND column_name = 'file_path'
              AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE provider_admin_documents
                ALTER COLUMN file_path DROP NOT NULL;
        END IF;
    END IF;
END $$;
