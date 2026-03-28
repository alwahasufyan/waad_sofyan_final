-- Squashed migration: V13__seed_initial_reference_data.sql
-- Initial reference and seed data
-- Generated: 2026-03-28T11:35:17


-- ===== BEGIN SOURCE: V20260324.001__ensure_email_preauth_schema.sql =====

-- Ensure email pre-authorization schema exists for legacy databases.
-- This migration is intentionally idempotent and safe to run multiple times.

CREATE TABLE IF NOT EXISTS email_settings (
    id                  BIGSERIAL PRIMARY KEY,
    email_address       VARCHAR(255) NOT NULL,
    display_name        VARCHAR(255),
    smtp_host           VARCHAR(255),
    smtp_port           INTEGER,
    smtp_username       VARCHAR(255),
    smtp_password       TEXT,
    imap_host           VARCHAR(255),
    imap_port           INTEGER,
    imap_username       VARCHAR(255),
    imap_password       TEXT,
    encryption_type     VARCHAR(20) DEFAULT 'TLS',
    listener_enabled    BOOLEAN DEFAULT FALSE,
    sync_interval_mins  INTEGER DEFAULT 5,
    last_sync_at        TIMESTAMP,
    is_active           BOOLEAN DEFAULT TRUE,
    subject_filter      VARCHAR(255),
    only_from_providers BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_email_settings_active
    ON email_settings(is_active)
    WHERE is_active = true;

INSERT INTO email_settings (email_address, display_name, smtp_host, smtp_port, encryption_type, listener_enabled)
SELECT 'preauth@alwahacare.com', 'Alwahacare Pre-Auth', 'smtp.hostinger.com', 587, 'TLS', FALSE
WHERE NOT EXISTS (SELECT 1 FROM email_settings);

CREATE TABLE IF NOT EXISTS pre_auth_email_requests (
    id BIGSERIAL PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE,
    sender_email VARCHAR(255),
    sender_name VARCHAR(255),
    subject VARCHAR(500),
    body_text TEXT,
    body_html TEXT,
    received_at TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    converted_to_pre_auth_id BIGINT,
    provider_id BIGINT,
    member_id BIGINT,
    detected_service_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pre_auth_email_attachments (
    id BIGSERIAL PRIMARY KEY,
    email_request_id BIGINT NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    stored_file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_preauth_email_sender ON pre_auth_email_requests(sender_email);
CREATE INDEX IF NOT EXISTS idx_preauth_email_processed ON pre_auth_email_requests(processed);
CREATE INDEX IF NOT EXISTS idx_preauth_email_received ON pre_auth_email_requests(received_at);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'pre_auth_email_attachments'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'pre_auth_email_requests'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_email_request'
    ) THEN
        ALTER TABLE pre_auth_email_attachments
            ADD CONSTRAINT fk_email_request
            FOREIGN KEY (email_request_id)
            REFERENCES pre_auth_email_requests(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'pre_auth_email_requests'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'medical_services'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_email_detected_service'
    ) THEN
        ALTER TABLE pre_auth_email_requests
            ADD CONSTRAINT fk_email_detected_service
            FOREIGN KEY (detected_service_id)
            REFERENCES medical_services(id);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'pre_authorizations'
    ) THEN
        ALTER TABLE pre_authorizations ADD COLUMN IF NOT EXISTS email_request_id BIGINT;

        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'pre_auth_email_requests'
        ) AND NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_preauth_email_request'
        ) THEN
            ALTER TABLE pre_authorizations
                ADD CONSTRAINT fk_preauth_email_request
                FOREIGN KEY (email_request_id)
                REFERENCES pre_auth_email_requests(id);
        END IF;
    END IF;
END $$;

-- ===== END SOURCE: V20260324.001__ensure_email_preauth_schema.sql =====

