-- V11__claims_and_claim_lines.sql
-- Extracted from V1 baseline during full split.

-- 10) Claims
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS claim_batches (
    id BIGSERIAL PRIMARY KEY,
    batch_code VARCHAR(30) NOT NULL UNIQUE,
    provider_id BIGINT NOT NULL,
    employer_id BIGINT NOT NULL,
    batch_year INT NOT NULL,
    batch_month INT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    CONSTRAINT uk_claim_batch_provider_period UNIQUE (provider_id, employer_id, batch_year, batch_month)
);

CREATE INDEX IF NOT EXISTS idx_claim_batch_lookup
    ON claim_batches(provider_id, employer_id, batch_year, batch_month);

CREATE TABLE IF NOT EXISTS claims (
    id BIGINT PRIMARY KEY DEFAULT nextval('claim_seq'),
    claim_number VARCHAR(100) NOT NULL UNIQUE,
    external_claim_ref VARCHAR(100),

    member_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    provider_name VARCHAR(255),

    visit_id BIGINT NOT NULL,

    service_date DATE NOT NULL,
    diagnosis_code VARCHAR(50),
    diagnosis_description TEXT,
    complaint TEXT,

    requested_amount NUMERIC(15,2) NOT NULL CHECK (requested_amount >= 0),
    approved_amount NUMERIC(15,2),
    paid_amount NUMERIC(15,2),
    patient_share NUMERIC(15,2),
    refused_amount DECIMAL(15,2) DEFAULT 0,
    difference_amount NUMERIC(15,2),
    patient_copay NUMERIC(15,2),
    net_provider_amount NUMERIC(15,2),
    copay_percent NUMERIC(5,2),
    deductible_applied NUMERIC(15,2),

    status VARCHAR(50) NOT NULL CHECK (status IN (
        'DRAFT','SUBMITTED','UNDER_REVIEW','NEEDS_CORRECTION','APPROVAL_IN_PROGRESS',
        'APPROVED','BATCHED','SETTLED','REJECTED',
        'RETURNED_FOR_INFO','PENDING_APPROVAL','BACKLOG_IMPORT'
    )),
    submitted_at TIMESTAMP,

    reviewer_id BIGINT,
    reviewed_at TIMESTAMP,
    approval_reason TEXT,
    reviewer_comment TEXT,
    doctor_name VARCHAR(255),

    pre_authorization_id BIGINT,

    payment_reference VARCHAR(100),
    settled_at TIMESTAMP,
    settlement_notes TEXT,

    expected_completion_date DATE,
    actual_completion_date DATE,
    within_sla BOOLEAN,
    business_days_taken INTEGER,
    sla_days_configured INTEGER,

    service_count INTEGER,
    attachments_count INTEGER,

    is_backlog BOOLEAN DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT true,
    version BIGINT NOT NULL DEFAULT 0,

    manual_category_enabled BOOLEAN DEFAULT FALSE,
    primary_category_code VARCHAR(50),

    claim_batch_id BIGINT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),

    CONSTRAINT fk_claim_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_preauth FOREIGN KEY (pre_authorization_id) REFERENCES preauthorization_requests(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claim_visit FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE RESTRICT,
    CONSTRAINT fk_claims_claim_batch FOREIGN KEY (claim_batch_id) REFERENCES claim_batches(id) ON DELETE SET NULL,
    CONSTRAINT chk_claim_date CHECK (service_date <= CURRENT_DATE AND service_date >= CURRENT_DATE - INTERVAL '10 years')
);

CREATE INDEX IF NOT EXISTS idx_claims_member_date_status ON claims(member_id, service_date DESC, status);
CREATE INDEX IF NOT EXISTS idx_claims_provider_status ON claims(provider_id, status, approved_amount);
CREATE INDEX IF NOT EXISTS idx_claims_reviewer ON claims(reviewer_id, status, service_date DESC);
CREATE INDEX IF NOT EXISTS idx_claims_unassigned ON claims(status, service_date DESC) WHERE reviewer_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_claims_provider_date ON claims(provider_id, service_date DESC, status);
CREATE INDEX IF NOT EXISTS idx_claims_pre_auth ON claims(pre_authorization_id);
CREATE INDEX IF NOT EXISTS idx_claims_monthly_reporting ON claims(status, service_date, approved_amount);
CREATE INDEX IF NOT EXISTS idx_claims_sla ON claims(within_sla, actual_completion_date);
CREATE INDEX IF NOT EXISTS idx_claims_pending_review ON claims(status, created_at DESC) WHERE status = 'SUBMITTED';
CREATE INDEX IF NOT EXISTS idx_claims_approval_metrics ON claims(status, reviewed_at, approved_amount);

CREATE INDEX IF NOT EXISTS idx_claims_provider_status_approved
    ON claims(provider_id, status, approved_amount)
    WHERE status = 'APPROVED';
CREATE INDEX IF NOT EXISTS idx_claims_reviewer_status_date
    ON claims(reviewer_id, status, service_date DESC);
CREATE INDEX IF NOT EXISTS idx_claims_member_date_status_reporting
    ON claims(member_id, service_date DESC, status);
CREATE INDEX IF NOT EXISTS idx_claims_provider_date_status
    ON claims(provider_id, service_date DESC, status);
CREATE INDEX IF NOT EXISTS idx_claims_monthly_reporting_full
    ON claims(status, service_date, provider_id, approved_amount);
CREATE INDEX IF NOT EXISTS idx_claims_approval_metrics_full
    ON claims(status, reviewed_at, approved_amount)
    WHERE status IN ('APPROVED','REJECTED');

CREATE TABLE IF NOT EXISTS claim_lines (
    id BIGSERIAL PRIMARY KEY,
    claim_id BIGINT NOT NULL,

    service_code VARCHAR(50) NOT NULL,
    service_description VARCHAR(255),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
    total_amount NUMERIC(15,2) CHECK (total_amount >= 0),
    total_price NUMERIC(15,2) NOT NULL,

    medical_service_id BIGINT,
    service_name VARCHAR(255),
    service_category_id BIGINT,
    service_category_name VARCHAR(200),

    requires_pa BOOLEAN NOT NULL DEFAULT false,

    line_number INTEGER,
    approved_amount NUMERIC(15,2),
    approved_units INTEGER,
    approval_notes TEXT,

    coverage_percent_snapshot INTEGER,
    patient_copay_percent_snapshot INTEGER,
    times_limit_snapshot INTEGER,
    amount_limit_snapshot NUMERIC(15,2),

    refused_amount NUMERIC(15,2) DEFAULT 0,

    version BIGINT NOT NULL DEFAULT 0,
    rejection_reason VARCHAR(500),
    rejection_reason_code VARCHAR(50),
    reviewer_notes TEXT,
    rejected BOOLEAN DEFAULT false,
    requested_unit_price NUMERIC(15,2),
    approved_unit_price NUMERIC(15,2),
    requested_quantity INTEGER,
    approved_quantity INTEGER,

    applied_category_id BIGINT,
    applied_category_name VARCHAR(200),

    pricing_item_id BIGINT,
    benefit_limit NUMERIC(15,2),
    used_amount_snapshot NUMERIC(15,2),
    remaining_amount_snapshot NUMERIC(15,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),

    CONSTRAINT fk_claim_line_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    CONSTRAINT fk_claim_line_service FOREIGN KEY (medical_service_id) REFERENCES medical_services(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_claim_line_claim ON claim_lines(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_line_service ON claim_lines(medical_service_id);
CREATE INDEX IF NOT EXISTS idx_claim_line_service_analysis ON claim_lines(medical_service_id, total_price);

CREATE TABLE IF NOT EXISTS claim_attachments (
    id BIGSERIAL PRIMARY KEY,
    claim_id BIGINT NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(500),
    created_at TIMESTAMP NOT NULL,
    file_url VARCHAR(1000),
    original_file_name VARCHAR(500),
    file_key VARCHAR(500),
    file_type VARCHAR(100),
    file_size BIGINT,
    attachment_type VARCHAR(50)
        CHECK (attachment_type IN ('PRESCRIPTION','LAB_RESULT','XRAY','REFERRAL_LETTER','DISCHARGE_SUMMARY','OTHER')),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(255),

    CONSTRAINT fk_claim_attachment FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_claim_attachments_claim ON claim_attachments(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_attachments_type ON claim_attachments(attachment_type);
CREATE INDEX IF NOT EXISTS idx_claim_attachments_date ON claim_attachments(claim_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claim_attachments_type_date ON claim_attachments(attachment_type, created_at DESC);

CREATE TABLE IF NOT EXISTS claim_history (
    id BIGSERIAL PRIMARY KEY,
    claim_id BIGINT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(255),
    reason TEXT,

    CONSTRAINT fk_claim_history FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_claim_history_timeline ON claim_history(claim_id, changed_at DESC, new_status);

CREATE TABLE IF NOT EXISTS claim_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    claim_id BIGINT NOT NULL,
    change_type VARCHAR(50) NOT NULL,
    previous_status VARCHAR(30),
    new_status VARCHAR(30),
    previous_requested_amount NUMERIC(15,2),
    new_requested_amount NUMERIC(15,2),
    previous_approved_amount NUMERIC(15,2),
    new_approved_amount NUMERIC(15,2),
    actor_user_id BIGINT NOT NULL,
    actor_username VARCHAR(100) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comment TEXT,
    ip_address VARCHAR(45),
    before_snapshot TEXT,
    after_snapshot TEXT,

    CONSTRAINT fk_claim_audit_claim FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_claim_audit_claim_timestamp ON claim_audit_logs(claim_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_claim_audit_user_timestamp ON claim_audit_logs(actor_user_id, timestamp DESC);

-- ----------------------------------------------------------

-- Merged from former V15__claims_soft_delete_compatibility.sql
ALTER TABLE claims
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
    ADD COLUMN IF NOT EXISTS full_coverage BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_claims_deleted_at ON claims (deleted_at);
CREATE INDEX IF NOT EXISTS idx_claims_active_deleted ON claims (active, deleted_at DESC);

-- Merged from former V17__claims_providers_policies_runtime_compatibility.sql
ALTER TABLE visits
    ADD COLUMN IF NOT EXISTS complaint VARCHAR(1000);

UPDATE providers
SET provider_name = COALESCE(provider_name, name, provider_name_ar)
WHERE provider_name IS NULL;

ALTER TABLE providers
    ALTER COLUMN provider_name DROP NOT NULL;

UPDATE benefit_policies
SET policy_name = COALESCE(policy_name, name)
WHERE policy_name IS NULL;

ALTER TABLE benefit_policies
    ALTER COLUMN policy_name DROP NOT NULL;

-- Merged from former V19__provider_user_contracts_runtime_compatibility.sql
ALTER TABLE visits
    ADD COLUMN IF NOT EXISTS network_status VARCHAR(30);

UPDATE visits
SET network_status = COALESCE(network_status, 'IN_NETWORK')
WHERE network_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_visits_network_status ON visits(network_status);

ALTER TABLE provider_allowed_employers
    ADD COLUMN IF NOT EXISTS active BOOLEAN,
    ADD COLUMN IF NOT EXISTS notes VARCHAR(500);

UPDATE provider_allowed_employers
SET active = COALESCE(active, true)
WHERE active IS NULL;

ALTER TABLE provider_allowed_employers
    ALTER COLUMN active SET DEFAULT true,
    ALTER COLUMN active SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pae_active ON provider_allowed_employers(active);

UPDATE email_verification_tokens
SET expiry_date = COALESCE(expiry_date, expires_at, CURRENT_TIMESTAMP + INTERVAL '24 hours')
WHERE expiry_date IS NULL;

ALTER TABLE email_verification_tokens
    ALTER COLUMN expiry_date SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours');

ALTER TABLE provider_contracts
    ALTER COLUMN employer_id DROP NOT NULL;

ALTER TABLE provider_admin_documents
    ADD COLUMN IF NOT EXISTS type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS file_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS document_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS expiry_date DATE,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

UPDATE provider_admin_documents
SET
    type = COALESCE(type, document_type, 'OTHER'),
    file_name = COALESCE(file_name, document_name, regexp_replace(COALESCE(file_path, ''), '^.*/', '')),
    created_at = COALESCE(created_at, uploaded_at, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, uploaded_at, created_at, CURRENT_TIMESTAMP),
    uploaded_at = COALESCE(uploaded_at, created_at, CURRENT_TIMESTAMP)
WHERE
    type IS NULL
    OR file_name IS NULL
    OR created_at IS NULL
    OR updated_at IS NULL
    OR uploaded_at IS NULL;

ALTER TABLE provider_admin_documents
    ALTER COLUMN type SET NOT NULL,
    ALTER COLUMN file_name SET NOT NULL,
    ALTER COLUMN uploaded_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN uploaded_at SET NOT NULL,
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_provider_docs_type_new ON provider_admin_documents(type);

-- Merged from former V21__member_barcode_and_pricing_unit_price_compatibility.sql
CREATE SEQUENCE IF NOT EXISTS member_barcode_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    NO MAXVALUE
    CACHE 1;

DO $$
DECLARE
    v_max_suffix BIGINT;
BEGIN
    SELECT COALESCE(MAX((regexp_match(barcode, '^(?:WAHA|WAD)-\\d{4}-(\\d+)$'))[1]::BIGINT), 0)
      INTO v_max_suffix
      FROM members
     WHERE barcode IS NOT NULL
       AND barcode ~ '^(?:WAHA|WAD)-\\d{4}-\\d+$';

    IF v_max_suffix > 0 THEN
        PERFORM setval('member_barcode_seq', v_max_suffix, true);
    ELSE
        PERFORM setval('member_barcode_seq', 1, false);
    END IF;
END $$;

ALTER TABLE provider_contract_pricing_items
    ALTER COLUMN unit_price SET DEFAULT 0;

UPDATE provider_contract_pricing_items
SET unit_price = COALESCE(unit_price, contract_price, base_price, 0)
WHERE unit_price IS NULL;

-- Merged from former V22__members_documents_taxonomy_runtime_compatibility.sql
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

CREATE OR REPLACE FUNCTION public.lower(bytea)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT pg_catalog.lower(convert_from($1, 'UTF8'))
$$;

CREATE INDEX IF NOT EXISTS idx_medical_service_categories_service_active
    ON medical_service_categories(service_id, active);

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

-- Merged from former V23__members_and_provider_documents_legacy_notnull_compatibility.sql
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'members'
          AND column_name = 'date_of_birth'
    ) THEN
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

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'provider_admin_documents'
    ) THEN
        UPDATE provider_admin_documents
        SET document_type = COALESCE(document_type, type)
        WHERE document_type IS NULL;

        UPDATE provider_admin_documents
        SET document_name = COALESCE(document_name, file_name, document_number, type)
        WHERE document_name IS NULL;

        UPDATE provider_admin_documents
        SET file_path = COALESCE(file_path, file_url)
        WHERE file_path IS NULL;

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

-- ----------------------------------------------------------
