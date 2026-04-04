-- Compatibility migration for pre-authorization schema drift between
-- split baseline tables and current JPA entities.

DO $$
DECLARE
    request_date_type text;
BEGIN
    SELECT data_type
    INTO request_date_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pre_authorizations'
      AND column_name = 'request_date';

    IF request_date_type = 'timestamp without time zone' OR request_date_type = 'timestamp with time zone' THEN
        ALTER TABLE pre_authorizations
            ALTER COLUMN request_date TYPE DATE
            USING request_date::date;
    END IF;
END $$;

ALTER TABLE pre_authorization_attachments
    ADD COLUMN IF NOT EXISTS pre_authorization_id BIGINT,
    ADD COLUMN IF NOT EXISTS original_file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stored_file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;

UPDATE pre_authorization_attachments
SET pre_authorization_id = COALESCE(pre_authorization_id, preauthorization_request_id),
    original_file_name = COALESCE(original_file_name, LEFT(file_name, 255)),
    stored_file_name = COALESCE(stored_file_name, LEFT(file_name, 255)),
    created_by = COALESCE(created_by, LEFT(uploaded_by, 100)),
    created_at = COALESCE(created_at, uploaded_at)
WHERE pre_authorization_id IS NULL
   OR original_file_name IS NULL
   OR stored_file_name IS NULL
   OR created_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_preauth_attachments_preauth_id
    ON pre_authorization_attachments(pre_authorization_id);