-- V10__preauthorizations.sql
-- Extracted from V1 baseline during full split.

CREATE TABLE IF NOT EXISTS preauthorization_requests (
    id BIGSERIAL PRIMARY KEY,
    request_number VARCHAR(100),
    provider_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,

    service_date DATE,
    requested_service_date DATE,
    diagnosis_code VARCHAR(50),
    diagnosis_description TEXT,

    requested_amount NUMERIC(15,2),
    approved_amount NUMERIC(15,2),

    status VARCHAR(50)
        CHECK (status IN ('PENDING','APPROVED','REJECTED','EXPIRED','CANCELLED')),

    valid_from TIMESTAMP,
    valid_until TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    approved_at TIMESTAMP,
    created_by VARCHAR(255),
    approved_by VARCHAR(255),

    CONSTRAINT fk_pauthreq_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pauthreq_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_pauthreq_member_status_date ON preauthorization_requests(member_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pauthreq_expiring ON preauthorization_requests(valid_until)
    WHERE status = 'APPROVED' AND valid_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pauthreq_provider_date ON preauthorization_requests(provider_id, created_at DESC, status);

CREATE TABLE IF NOT EXISTS pre_authorizations (
    id BIGSERIAL PRIMARY KEY,
    active BOOLEAN DEFAULT true,
    approved_amount NUMERIC(15,2),
    approved_at TIMESTAMP,
    approved_by VARCHAR(255),
    contract_price NUMERIC(15,2),
    copay_amount NUMERIC(15,2),
    copay_percentage NUMERIC(10,2),
    coverage_percent_snapshot INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    currency VARCHAR(20),
    diagnosis_code VARCHAR(100),
    diagnosis_description TEXT,
    expected_service_date DATE,
    expiry_date DATE,
    insurance_covered_amount NUMERIC(15,2),
    medical_service_id BIGINT,
    member_id BIGINT,
    notes TEXT,
    patient_copay_percent_snapshot INTEGER,
    pre_auth_number VARCHAR(100),
    priority VARCHAR(50),
    provider_id BIGINT,
    reference_number VARCHAR(100),
    rejection_reason TEXT,
    request_date TIMESTAMP,
    requires_pa BOOLEAN,
    reserved_amount NUMERIC(15,2),
    service_category_id BIGINT,
    service_category_name VARCHAR(255),
    service_code VARCHAR(100),
    service_name VARCHAR(255),
    service_type VARCHAR(100),
    status VARCHAR(50),
    updated_at TIMESTAMP,
    updated_by VARCHAR(255),
    version BIGINT,
    visit_id BIGINT
);

CREATE INDEX IF NOT EXISTS idx_preauth_member_id ON pre_authorizations(member_id);
CREATE INDEX IF NOT EXISTS idx_preauth_provider_id ON pre_authorizations(provider_id);
CREATE INDEX IF NOT EXISTS idx_preauth_status ON pre_authorizations(status);

CREATE TABLE IF NOT EXISTS pre_authorization_attachments (
    id BIGSERIAL PRIMARY KEY,
    preauthorization_request_id BIGINT NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(500),
    file_type VARCHAR(100),
    file_size BIGINT,
    attachment_type VARCHAR(50),
    uploaded_by VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_preauth_att FOREIGN KEY (preauthorization_request_id)
        REFERENCES preauthorization_requests(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pre_authorization_audit (
    id BIGSERIAL PRIMARY KEY,
    pre_authorization_id BIGINT NOT NULL,
    reference_number VARCHAR(50),
    changed_by VARCHAR(100) NOT NULL,
    change_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(20) NOT NULL,
    field_name VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    notes VARCHAR(500),
    ip_address VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_preauth_audit_id ON pre_authorization_audit(pre_authorization_id);
CREATE INDEX IF NOT EXISTS idx_preauth_audit_user ON pre_authorization_audit(changed_by);
CREATE INDEX IF NOT EXISTS idx_preauth_audit_date ON pre_authorization_audit(change_date DESC);
CREATE INDEX IF NOT EXISTS idx_preauth_audit_action ON pre_authorization_audit(action);

-- ----------------------------------------------------------
-- Email pre-authorization schema (legacy-compatible)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_settings (
    id BIGSERIAL PRIMARY KEY,
    email_address VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    smtp_host VARCHAR(255),
    smtp_port INTEGER,
    smtp_username VARCHAR(255),
    smtp_password TEXT,
    imap_host VARCHAR(255),
    imap_port INTEGER,
    imap_username VARCHAR(255),
    imap_password TEXT,
    encryption_type VARCHAR(20) DEFAULT 'TLS',
    listener_enabled BOOLEAN DEFAULT FALSE,
    sync_interval_mins INTEGER DEFAULT 5,
    last_sync_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    subject_filter VARCHAR(255),
    only_from_providers BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_email_settings_active
    ON email_settings(is_active)
    WHERE is_active = true;

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
