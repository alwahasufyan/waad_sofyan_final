-- Auto-generated consolidated migration copy (deduplicated)
-- Group: V20260324.107__email_and_preauth_email.sql



-- ===== BEGIN SOURCE: V220__schema_email_settings.sql =====

-- ============================================================
-- V220: Email Configuration for Pre-Authorization System
-- ============================================================

CREATE TABLE IF NOT EXISTS email_settings (
    id                  BIGSERIAL PRIMARY KEY,
    email_address       VARCHAR(255) NOT NULL,
    display_name        VARCHAR(255),
    
    -- SMTP Configuration
    smtp_host           VARCHAR(255),
    smtp_port           INTEGER,
    smtp_username       VARCHAR(255),
    smtp_password       TEXT, -- Encrypted
    
    -- IMAP Configuration
    imap_host           VARCHAR(255),
    imap_port           INTEGER,
    imap_username       VARCHAR(255),
    imap_password       TEXT, -- Encrypted
    
    -- Sync Settings
    encryption_type     VARCHAR(20) DEFAULT 'TLS', -- SSL, TLS, NONE
    listener_enabled    BOOLEAN DEFAULT FALSE,
    sync_interval_mins  INTEGER DEFAULT 5,
    last_sync_at        TIMESTAMP,
    
    -- Common Fields
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100)
);

-- Index for active settings
CREATE INDEX idx_email_settings_active ON email_settings(is_active) WHERE is_active = true;

-- Sample entry (disabled by default)
INSERT INTO email_settings (email_address, display_name, smtp_host, smtp_port, encryption_type, listener_enabled)
VALUES ('preauth@alwahacare.com', 'Alwahacare Pre-Auth', 'smtp.hostinger.com', 587, 'TLS', FALSE);

-- ===== END SOURCE: V220__schema_email_settings.sql =====



-- ===== BEGIN SOURCE: V222__add_service_to_email_request.sql =====

-- Add detected_service_id to pre_auth_email_requests
ALTER TABLE pre_auth_email_requests ADD COLUMN detected_service_id BIGINT;
ALTER TABLE pre_auth_email_requests ADD CONSTRAINT fk_email_detected_service FOREIGN KEY (detected_service_id) REFERENCES medical_services(id);

-- ===== END SOURCE: V222__add_service_to_email_request.sql =====



-- ===== BEGIN SOURCE: V224__add_email_filtering_settings.sql =====

-- Add filtering columns to email_settings table
ALTER TABLE email_settings ADD COLUMN subject_filter VARCHAR(255);
ALTER TABLE email_settings ADD COLUMN only_from_providers BOOLEAN DEFAULT FALSE;

-- ===== END SOURCE: V224__add_email_filtering_settings.sql =====



-- ===== BEGIN SOURCE: V225__add_sender_name_to_email_requests.sql =====

-- Add sender_name to pre_auth_email_requests
ALTER TABLE pre_auth_email_requests ADD COLUMN sender_name VARCHAR(255);

-- ===== END SOURCE: V225__add_sender_name_to_email_requests.sql =====

