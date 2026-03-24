-- Auto-generated consolidated migration copy
-- Source snapshot: D:\waad_sofyan_final\backend\src\main\resources\db\migration_archive_20260324_093938
-- Group: V20260324.105__visits_claims_and_preauthorizations.sql



-- ===== BEGIN SOURCE: V060__schema_visits.sql =====

-- ============================================================
-- V060: Patient visits and attachments
-- ============================================================
-- Depends on: V050 (members), V005 (employers), V006 (providers),
--             V020 (medical_categories), V021 (medical_services)

-- ----------------------------------------------------------
-- SECTION 1: Visits (central patient encounter record)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS visits (
    id          BIGSERIAL PRIMARY KEY,
    member_id   BIGINT NOT NULL,
    employer_id BIGINT,
    provider_id BIGINT,

    -- Medical category / service
    medical_category_id   BIGINT,
    medical_category_name VARCHAR(200),
    medical_service_id    BIGINT,
    medical_service_code  VARCHAR(50),
    medical_service_name  VARCHAR(200),

    -- Visit details
    doctor_name      VARCHAR(255),
    specialty        VARCHAR(100),
    visit_date       DATE NOT NULL,
    diagnosis        TEXT,
    treatment        TEXT,
    total_amount     NUMERIC(10,2),
    notes            TEXT,

    -- Visit type and status
    visit_type VARCHAR(30) DEFAULT 'OUTPATIENT'
        CHECK (visit_type IN (
            'EMERGENCY','INPATIENT','OUTPATIENT','ROUTINE','FOLLOW_UP',
            'PREVENTIVE','SPECIALIZED','HOME_CARE','TELECONSULTATION',
            'DAY_SURGERY','LEGACY_BACKLOG'
        )),
    status VARCHAR(30) DEFAULT 'REGISTERED'
        CHECK (status IN (
            'REGISTERED','IN_PROGRESS','PENDING_PREAUTH',
            'CLAIM_SUBMITTED','COMPLETED','CANCELLED'
        )),

    -- Eligibility check that produced this visit
    eligibility_check_id BIGINT,

    -- Optimistic locking
    version BIGINT DEFAULT 0,

    -- Audit
    active      BOOLEAN DEFAULT true,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_visit_member   FOREIGN KEY (member_id)   REFERENCES members(id)   ON DELETE RESTRICT,
    CONSTRAINT fk_visit_employer FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE RESTRICT,
    CONSTRAINT chk_visit_date_reasonable CHECK (
        visit_date <= CURRENT_DATE AND visit_date >= CURRENT_DATE - INTERVAL '10 years'
    )
);

CREATE INDEX IF NOT EXISTS idx_visits_member      ON visits(member_id);
CREATE INDEX IF NOT EXISTS idx_visits_employer    ON visits(employer_id);
CREATE INDEX IF NOT EXISTS idx_visits_provider    ON visits(provider_id);
CREATE INDEX IF NOT EXISTS idx_visits_date        ON visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_status      ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_member_date ON visits(member_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_provider_date ON visits(provider_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_category    ON visits(medical_category_id) WHERE medical_category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visits_service     ON visits(medical_service_id)  WHERE medical_service_id  IS NOT NULL;

-- ----------------------------------------------------------
-- SECTION 2: Visit supporting documents
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS visit_attachments (
    id                  BIGSERIAL PRIMARY KEY,
    visit_id            BIGINT NOT NULL,
    file_name           VARCHAR(500) NOT NULL,
    original_file_name  VARCHAR(500),
    file_key            VARCHAR(500),
    file_type           VARCHAR(100),
    file_size           BIGINT,
    attachment_type     VARCHAR(50)
        CHECK (attachment_type IN ('XRAY','MRI','CT_SCAN','LAB_RESULT','PRESCRIPTION','MEDICAL_REPORT','OTHER')),
    description         TEXT,
    uploaded_by         VARCHAR(100),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_visit_attachment FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_visit_attachments_visit      ON visit_attachments(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_attachments_type       ON visit_attachments(attachment_type);
CREATE INDEX IF NOT EXISTS idx_visit_attachments_visit_date ON visit_attachments(visit_id, created_at DESC);

-- ===== END SOURCE: V060__schema_visits.sql =====



-- ===== BEGIN SOURCE: V065__schema_pre_authorization.sql =====

-- ============================================================
-- V065: Pre-authorizations
-- ============================================================
-- Depends on: V006 (providers), V050 (members),
--             V021 (medical_services), V060 (visits)

-- ----------------------------------------------------------
-- SECTION 1: Pre-authorization requests (original model)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS preauthorization_requests (
    id              BIGSERIAL PRIMARY KEY,
    request_number  VARCHAR(100),
    provider_id     BIGINT NOT NULL,
    member_id       BIGINT NOT NULL,

    -- Service details
    service_date            DATE,
    requested_service_date  DATE,
    diagnosis_code          VARCHAR(50),
    diagnosis_description   TEXT,

    -- Financial
    requested_amount NUMERIC(15,2),
    approved_amount  NUMERIC(15,2),

    -- Status machine
    status VARCHAR(50)
        CHECK (status IN ('PENDING','APPROVED','REJECTED','EXPIRED','CANCELLED')),

    -- Validity window
    valid_from  TIMESTAMP,
    valid_until TIMESTAMP,

    -- Audit
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP,
    approved_at TIMESTAMP,
    created_by  VARCHAR(255),
    approved_by VARCHAR(255),

    CONSTRAINT fk_pauthreq_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pauthreq_member   FOREIGN KEY (member_id)   REFERENCES members(id)   ON DELETE RESTRICT
);

-- Sequences for this table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'preauth_seq') THEN
        CREATE SEQUENCE preauth_seq START WITH 1 INCREMENT BY 50;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pauthreq_member_status_date ON preauthorization_requests(member_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pauthreq_expiring           ON preauthorization_requests(valid_until)
    WHERE status = 'APPROVED' AND valid_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pauthreq_provider_date      ON preauthorization_requests(provider_id, created_at DESC, status);

-- ----------------------------------------------------------
-- SECTION 2: Pre-authorizations (runtime compatibility table)
-- ----------------------------------------------------------
-- This table satisfies JPQL queries that join on pre_authorizations.
-- It mirrors the full shape of the pre-authorization JPA entity.
CREATE TABLE IF NOT EXISTS pre_authorizations (
    id                              BIGSERIAL PRIMARY KEY,
    active                          BOOLEAN DEFAULT true,
    approved_amount                 NUMERIC(15,2),
    approved_at                     TIMESTAMP,
    approved_by                     VARCHAR(255),
    contract_price                  NUMERIC(15,2),
    copay_amount                    NUMERIC(15,2),
    copay_percentage                NUMERIC(10,2),
    coverage_percent_snapshot       INTEGER,
    created_at                      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by                      VARCHAR(255),
    currency                        VARCHAR(20),
    diagnosis_code                  VARCHAR(100),
    diagnosis_description           TEXT,
    expected_service_date           DATE,
    expiry_date                     DATE,
    insurance_covered_amount        NUMERIC(15,2),
    medical_service_id              BIGINT,
    member_id                       BIGINT,
    notes                           TEXT,
    patient_copay_percent_snapshot  INTEGER,
    pre_auth_number                 VARCHAR(100),
    priority                        VARCHAR(50),
    provider_id                     BIGINT,
    reference_number                VARCHAR(100),
    rejection_reason                TEXT,
    request_date                    TIMESTAMP,
    requires_pa                     BOOLEAN,
    reserved_amount                 NUMERIC(15,2),
    service_category_id             BIGINT,
    service_category_name           VARCHAR(255),
    service_code                    VARCHAR(100),
    service_name                    VARCHAR(255),
    service_type                    VARCHAR(100),
    status                          VARCHAR(50),
    updated_at                      TIMESTAMP,
    updated_by                      VARCHAR(255),
    version                         BIGINT,
    visit_id                        BIGINT
);

CREATE INDEX IF NOT EXISTS idx_preauth_member_id   ON pre_authorizations(member_id);
CREATE INDEX IF NOT EXISTS idx_preauth_provider_id ON pre_authorizations(provider_id);
CREATE INDEX IF NOT EXISTS idx_preauth_status      ON pre_authorizations(status);

-- ----------------------------------------------------------
-- SECTION 3: Pre-authorization supporting documents
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS pre_authorization_attachments (
    id                          BIGSERIAL PRIMARY KEY,
    preauthorization_request_id BIGINT NOT NULL,
    file_name                   VARCHAR(500) NOT NULL,
    file_path                   VARCHAR(500),
    file_type                   VARCHAR(100),
    file_size                   BIGINT,
    attachment_type             VARCHAR(50),
    uploaded_by                 VARCHAR(255),
    uploaded_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_preauth_att FOREIGN KEY (preauthorization_request_id)
        REFERENCES preauthorization_requests(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------
-- SECTION 4: Pre-authorization audit trail
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS pre_authorization_audit (
    id                    BIGSERIAL PRIMARY KEY,
    pre_authorization_id  BIGINT NOT NULL,
    reference_number      VARCHAR(50),
    changed_by            VARCHAR(100) NOT NULL,
    change_date           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action                VARCHAR(20) NOT NULL,
    field_name            VARCHAR(50),
    old_value             TEXT,
    new_value             TEXT,
    notes                 VARCHAR(500),
    ip_address            VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_preauth_audit_id     ON pre_authorization_audit(pre_authorization_id);
CREATE INDEX IF NOT EXISTS idx_preauth_audit_user   ON pre_authorization_audit(changed_by);
CREATE INDEX IF NOT EXISTS idx_preauth_audit_date   ON pre_authorization_audit(change_date DESC);
CREATE INDEX IF NOT EXISTS idx_preauth_audit_action ON pre_authorization_audit(action);

-- ===== END SOURCE: V065__schema_pre_authorization.sql =====



-- ===== BEGIN SOURCE: V070__schema_claims.sql =====

-- ============================================================
-- V070: Claims (insurance claim records)
-- ============================================================
-- Depends on: V050 (members), V006 (providers),
--             V065 (preauthorization_requests)

CREATE TABLE IF NOT EXISTS claims (
    id              BIGINT PRIMARY KEY DEFAULT nextval('claim_seq'),
    claim_number    VARCHAR(100) NOT NULL UNIQUE,
    external_claim_ref VARCHAR(100),

    -- Member + provider
    member_id       BIGINT NOT NULL,
    provider_id     BIGINT NOT NULL,
    provider_name   VARCHAR(255),

    -- Visit link
    visit_id        BIGINT,

    -- Service information
    service_date        DATE NOT NULL,
    diagnosis_code      VARCHAR(50),
    diagnosis_description TEXT,

    -- Financial amounts (NUMERIC(15,2) precision)
    requested_amount    NUMERIC(15,2) NOT NULL CHECK (requested_amount >= 0),
    approved_amount     NUMERIC(15,2),
    paid_amount         NUMERIC(15,2),
    patient_share       NUMERIC(15,2),
    refused_amount      DECIMAL(15,2) DEFAULT 0,
    difference_amount   NUMERIC(15,2),
    patient_copay       NUMERIC(15,2),
    net_provider_amount NUMERIC(15,2),
    copay_percent       NUMERIC(5,2),
    deductible_applied  NUMERIC(15,2),

    -- Status workflow
    status VARCHAR(50) NOT NULL
        CHECK (status IN (
            'APPROVED','BATCHED','SETTLED','REJECTED','SUBMITTED',
            'UNDER_REVIEW','RETURNED_FOR_INFO','PENDING_APPROVAL','BACKLOG_IMPORT'
        )),
    submitted_at TIMESTAMP,

    -- Review and approval
    reviewer_id       BIGINT,
    reviewed_at       TIMESTAMP,
    approval_reason   TEXT,
    reviewer_comment  TEXT,
    doctor_name       VARCHAR(255),

    -- Pre-authorization link
    pre_authorization_id BIGINT,

    -- Payment tracking
    payment_reference   VARCHAR(100),
    settled_at          TIMESTAMP,
    settlement_notes    TEXT,

    -- SLA tracking
    expected_completion_date DATE,
    actual_completion_date   DATE,
    within_sla               BOOLEAN,
    business_days_taken      INTEGER,
    sla_days_configured      INTEGER,

    -- Aggregates (de-normalised for performance)
    service_count       INTEGER,
    attachments_count   INTEGER,

    -- Backlog import flag
    is_backlog BOOLEAN DEFAULT FALSE,

    -- Audit
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255),

    CONSTRAINT fk_claim_member   FOREIGN KEY (member_id)              REFERENCES members(id)                 ON DELETE RESTRICT,
    CONSTRAINT fk_claim_provider FOREIGN KEY (provider_id)            REFERENCES providers(id)               ON DELETE RESTRICT,
    CONSTRAINT fk_claim_preauth  FOREIGN KEY (pre_authorization_id)   REFERENCES preauthorization_requests(id) ON DELETE RESTRICT,
    CONSTRAINT chk_claim_date    CHECK (service_date <= CURRENT_DATE AND service_date >= CURRENT_DATE - INTERVAL '10 years')
);

CREATE INDEX IF NOT EXISTS idx_claims_member_date_status     ON claims(member_id, service_date DESC, status);
CREATE INDEX IF NOT EXISTS idx_claims_provider_status        ON claims(provider_id, status, approved_amount);
CREATE INDEX IF NOT EXISTS idx_claims_reviewer               ON claims(reviewer_id, status, service_date DESC);
CREATE INDEX IF NOT EXISTS idx_claims_unassigned             ON claims(status, service_date DESC) WHERE reviewer_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_claims_provider_date          ON claims(provider_id, service_date DESC, status);
CREATE INDEX IF NOT EXISTS idx_claims_pre_auth               ON claims(pre_authorization_id);
CREATE INDEX IF NOT EXISTS idx_claims_monthly_reporting      ON claims(status, service_date, approved_amount);
CREATE INDEX IF NOT EXISTS idx_claims_sla                    ON claims(within_sla, actual_completion_date);
CREATE INDEX IF NOT EXISTS idx_claims_pending_review         ON claims(status, created_at DESC) WHERE status = 'SUBMITTED';
CREATE INDEX IF NOT EXISTS idx_claims_approval_metrics       ON claims(status, reviewed_at, approved_amount);

-- ===== END SOURCE: V070__schema_claims.sql =====



-- ===== BEGIN SOURCE: V071__schema_claim_lines.sql =====

-- ============================================================
-- V071: Claim lines, attachments, history, and audit logs
-- ============================================================
-- Depends on: V070 (claims), V021 (medical_services), V010 (users)

-- ----------------------------------------------------------
-- SECTION 1: Claim line items (service-level detail)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS claim_lines (
    id          BIGSERIAL PRIMARY KEY,
    claim_id    BIGINT NOT NULL,

    -- Service details
    service_code        VARCHAR(50) NOT NULL,
    service_description VARCHAR(255),
    quantity            INTEGER,
    unit_price          NUMERIC(15,2) CHECK (unit_price >= 0),
    total_amount        NUMERIC(15,2) CHECK (total_amount >= 0),
    total_price         NUMERIC(15,2) NOT NULL,

    -- Service catalog link
    medical_service_id      BIGINT,
    service_name            VARCHAR(255),
    service_category_id     BIGINT,
    service_category_name   VARCHAR(200),

    -- PA requirement
    requires_pa BOOLEAN NOT NULL DEFAULT false,

    -- Approvals
    line_number         INTEGER,
    approved_amount     NUMERIC(15,2),
    approved_units      INTEGER,
    approval_notes      TEXT,

    -- Coverage snapshots at time of claim submission
    coverage_percent_snapshot       INTEGER,
    patient_copay_percent_snapshot  INTEGER,
    times_limit_snapshot            INTEGER,
    amount_limit_snapshot           NUMERIC(15,2),

    -- Refused amount tracking
    refused_amount NUMERIC(15,2) DEFAULT 0,

    -- Audit
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by  VARCHAR(255),

    CONSTRAINT fk_claim_line_claim   FOREIGN KEY (claim_id)          REFERENCES claims(id)          ON DELETE CASCADE,
    CONSTRAINT fk_claim_line_service FOREIGN KEY (medical_service_id) REFERENCES medical_services(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_claim_line_claim   ON claim_lines(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_line_service ON claim_lines(medical_service_id);
CREATE INDEX IF NOT EXISTS idx_claim_line_service_analysis ON claim_lines(medical_service_id, total_price);

-- ----------------------------------------------------------
-- SECTION 2: Claim supporting documents
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS claim_attachments (
    id                  BIGSERIAL PRIMARY KEY,
    claim_id            BIGINT NOT NULL,
    file_name           VARCHAR(500) NOT NULL,
    file_path           VARCHAR(500),
    created_at          TIMESTAMP NOT NULL,
    file_url            VARCHAR(1000),
    original_file_name  VARCHAR(500),
    file_key            VARCHAR(500),
    file_type           VARCHAR(100),
    file_size           BIGINT,
    attachment_type     VARCHAR(50)
        CHECK (attachment_type IN ('PRESCRIPTION','LAB_RESULT','XRAY','REFERRAL_LETTER','DISCHARGE_SUMMARY','OTHER')),
    uploaded_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by         VARCHAR(255),

    CONSTRAINT fk_claim_attachment FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_claim_attachments_claim ON claim_attachments(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_attachments_type  ON claim_attachments(attachment_type);
CREATE INDEX IF NOT EXISTS idx_claim_attachments_date  ON claim_attachments(claim_id, created_at DESC);

-- ----------------------------------------------------------
-- SECTION 3: Claim status change history (immutable)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS claim_history (
    id          BIGSERIAL PRIMARY KEY,
    claim_id    BIGINT NOT NULL,
    old_status  VARCHAR(50),
    new_status  VARCHAR(50),
    changed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by  VARCHAR(255),
    reason      TEXT,

    CONSTRAINT fk_claim_history FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_claim_history_timeline ON claim_history(claim_id, changed_at DESC, new_status);

-- ----------------------------------------------------------
-- SECTION 4: Claim audit log (field-level changes)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS claim_audit_logs (
    id                          BIGSERIAL PRIMARY KEY,
    claim_id                    BIGINT NOT NULL,
    change_type                 VARCHAR(50) NOT NULL,
    previous_status             VARCHAR(30),
    new_status                  VARCHAR(30),
    previous_requested_amount   NUMERIC(15,2),
    new_requested_amount        NUMERIC(15,2),
    previous_approved_amount    NUMERIC(15,2),
    new_approved_amount         NUMERIC(15,2),
    actor_user_id               BIGINT NOT NULL,
    actor_username              VARCHAR(100) NOT NULL,
    actor_role                  VARCHAR(50)  NOT NULL,
    timestamp                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comment                     TEXT,
    ip_address                  VARCHAR(45),
    before_snapshot             TEXT,
    after_snapshot              TEXT
);

CREATE INDEX IF NOT EXISTS idx_claim_audit_claim_id  ON claim_audit_logs(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_audit_timestamp ON claim_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_claim_audit_actor     ON claim_audit_logs(actor_user_id);

-- ===== END SOURCE: V071__schema_claim_lines.sql =====



-- ===== BEGIN SOURCE: V097__claim_lines_missing_columns.sql =====

-- ============================================================
-- V097: Backfill missing columns for claim_lines / claims
--
-- Fixes runtime JDBC errors like:
-- "column ... approved_quantity does not exist"
-- ============================================================

-- 1) claims.version (optimistic locking field in Claim entity)
ALTER TABLE claims
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- 2) claim_lines.version (optimistic locking field in ClaimLine entity)
ALTER TABLE claim_lines
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- 3) claim_lines review/audit fields present in ClaimLine entity
ALTER TABLE claim_lines
    ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS rejection_reason_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS reviewer_notes TEXT,
    ADD COLUMN IF NOT EXISTS rejected BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS requested_unit_price NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS approved_unit_price NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS requested_quantity INTEGER,
    ADD COLUMN IF NOT EXISTS approved_quantity INTEGER;

-- Optional hygiene for old rows: keep booleans non-null
UPDATE claim_lines
SET rejected = false
WHERE rejected IS NULL;

-- ===== END SOURCE: V097__claim_lines_missing_columns.sql =====



-- ===== BEGIN SOURCE: V102__add_complaint_to_claims.sql =====

-- V102: Add complaint column to claims table
-- Added 2026-03-08 as part of Claim Financial Calculations fix

ALTER TABLE claims
    ADD COLUMN IF NOT EXISTS complaint TEXT;

COMMENT ON COLUMN claims.complaint IS 'Patient or doctor complaint/notes about the claim at entry time.';

-- ===== END SOURCE: V102__add_complaint_to_claims.sql =====



-- ===== BEGIN SOURCE: V104__fix_draft_claims_net_provider_amount.sql =====

-- V104: Fix DRAFT claims that have approved_amount set but null net_provider_amount
-- These are batch-entry (backlog) claims created directly as processed.
-- net_provider_amount should equal approved_amount for these claims.

UPDATE claims
SET net_provider_amount = approved_amount,
    updated_at = NOW()
WHERE active = true
  AND status = 'DRAFT'
  AND approved_amount IS NOT NULL
  AND approved_amount > 0
  AND (net_provider_amount IS NULL OR net_provider_amount = 0);

-- ===== END SOURCE: V104__fix_draft_claims_net_provider_amount.sql =====



-- ===== BEGIN SOURCE: V105__add_coverage_category_context_to_claims.sql =====

-- ============================================================
-- V105: Add coverage category context to claims
-- ============================================================

-- 1. Add category context fields to claims table
ALTER TABLE claims 
ADD COLUMN manual_category_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN primary_category_code VARCHAR(50);

-- 2. Add applied category fields to claim_lines table
ALTER TABLE claim_lines
ADD COLUMN applied_category_id BIGINT,
ADD COLUMN applied_category_name VARCHAR(200);

-- 3. Update existing records (optional, but good for consistency)
UPDATE claims SET manual_category_enabled = FALSE WHERE manual_category_enabled IS NULL;

-- ===== END SOURCE: V105__add_coverage_category_context_to_claims.sql =====



-- ===== BEGIN SOURCE: V109__drop_claims_duplicate_index.sql =====

-- ============================================================
-- V109: Drop duplicate prevention index/constraint from claims
-- ============================================================
-- This constraint prevents same-day, same-provider claims of exact same amount
-- for the same member. It was causing issues during testing. 
-- Disabling this constraint to allow the system to function correctly.

ALTER TABLE claims DROP CONSTRAINT IF EXISTS idx_claims_duplicate_prevention;
DROP INDEX IF EXISTS idx_claims_duplicate_prevention;

-- ===== END SOURCE: V109__drop_claims_duplicate_index.sql =====



-- ===== BEGIN SOURCE: V110__add_pricing_item_id_to_claim_lines.sql =====

-- ============================================================
-- V110: Add pricing_item_id to claim_lines
--
-- This column is required to support unmapped services
-- that are directly linked to a provider contract pricing item.
-- ============================================================

ALTER TABLE claim_lines
    ADD COLUMN IF NOT EXISTS pricing_item_id BIGINT;

-- Add index for performance in contract-related queries
CREATE INDEX IF NOT EXISTS idx_claim_line_pricing_item ON claim_lines (pricing_item_id);

-- ===== END SOURCE: V110__add_pricing_item_id_to_claim_lines.sql =====



-- ===== BEGIN SOURCE: V112__add_missing_claim_line_snapshots.sql =====

-- ============================================================
-- V112: Add missing coverage snapshots to claim_lines
-- ============================================================

ALTER TABLE claim_lines
ADD COLUMN IF NOT EXISTS benefit_limit NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS used_amount_snapshot NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS remaining_amount_snapshot NUMERIC(15,2);

-- COMMENT: These fields were added to the ClaimLine entity but missed in previous migrations.
-- They are used for point-in-time audit of benefit consumption relative to limits.

-- ===== END SOURCE: V112__add_missing_claim_line_snapshots.sql =====



-- ===== BEGIN SOURCE: V113__fix_claims_cascade_delete.sql =====

-- Migration to change foreign key constraints on claims to ON DELETE CASCADE
-- This ensures that deleting a claim automatically removes its audit logs and batch item references,
-- which in turn ensures that member benefit limits (calculated from claim lines) are correctly updated.

-- 1. DROP and RE-CREATE fk_claim_audit_claim as CASCADE
ALTER TABLE claim_audit_logs 
DROP CONSTRAINT IF EXISTS fk_claim_audit_claim;

ALTER TABLE claim_audit_logs 
ADD CONSTRAINT fk_claim_audit_claim 
FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE;

-- 2. DROP and RE-CREATE fk_batch_item_claim as CASCADE
ALTER TABLE settlement_batch_items 
DROP CONSTRAINT IF EXISTS fk_batch_item_claim;

ALTER TABLE settlement_batch_items 
ADD CONSTRAINT fk_batch_item_claim 
FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE;

-- ===== END SOURCE: V113__fix_claims_cascade_delete.sql =====



-- ===== BEGIN SOURCE: V114__add_claim_batches_system.sql =====

-- =============================================
-- V114: Claim Batches System (Real Monthly Batches)
-- =============================================

-- 1. Create the claim_batches table
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
    ON claim_batches (provider_id, employer_id, batch_year, batch_month);

-- 2. Add claim_batch_id to claims table
ALTER TABLE claims
ADD COLUMN IF NOT EXISTS claim_batch_id BIGINT;

-- 3. Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_claims_claim_batch'
    ) THEN
        ALTER TABLE claims
            ADD CONSTRAINT fk_claims_claim_batch
            FOREIGN KEY (claim_batch_id) REFERENCES claim_batches(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Convert legacy DRAFT claims to SETTLED/REJECTED as requested
-- First handle potential rejections (where refused >= requested)
UPDATE claims 
SET status = 'REJECTED' 
WHERE status = 'DRAFT' AND refused_amount >= requested_amount AND requested_amount > 0 AND active = true;

-- Then move the rest to SETTLED
UPDATE claims 
SET status = 'SETTLED' 
WHERE status = 'DRAFT' AND active = true;

-- ===== END SOURCE: V114__add_claim_batches_system.sql =====



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



-- ===== BEGIN SOURCE: V210__add_claim_report_settings_columns.sql =====

-- ============================================================
-- V210: Add claim report customization columns to pdf_company_settings
-- ============================================================

ALTER TABLE pdf_company_settings 
ADD COLUMN IF NOT EXISTS claim_report_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS claim_report_primary_color VARCHAR(7),
ADD COLUMN IF NOT EXISTS claim_report_intro TEXT,
ADD COLUMN IF NOT EXISTS claim_report_footer_note TEXT,
ADD COLUMN IF NOT EXISTS claim_report_sig_right_top VARCHAR(255),
ADD COLUMN IF NOT EXISTS claim_report_sig_right_bottom VARCHAR(255),
ADD COLUMN IF NOT EXISTS claim_report_sig_left_top VARCHAR(255),
ADD COLUMN IF NOT EXISTS claim_report_sig_left_bottom VARCHAR(255);

-- ===== END SOURCE: V210__add_claim_report_settings_columns.sql =====



-- ===== BEGIN SOURCE: V221__schema_email_preauth_requests.sql =====

-- Phase 2: Email PreAuth Requests Schema
CREATE TABLE pre_auth_email_requests (
    id BIGSERIAL PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE,
    sender_email VARCHAR(255),
    subject VARCHAR(500),
    body_text TEXT,
    body_html TEXT,
    received_at TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    converted_to_pre_auth_id BIGINT,
    provider_id BIGINT,
    member_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Store attachments specifically for email requests before conversion
CREATE TABLE pre_auth_email_attachments (
    id BIGSERIAL PRIMARY KEY,
    email_request_id BIGINT NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    stored_file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_email_request FOREIGN KEY (email_request_id) REFERENCES pre_auth_email_requests(id) ON DELETE CASCADE
);

CREATE INDEX idx_preauth_email_sender ON pre_auth_email_requests(sender_email);
CREATE INDEX idx_preauth_email_processed ON pre_auth_email_requests(processed);
CREATE INDEX idx_preauth_email_received ON pre_auth_email_requests(received_at);

-- ===== END SOURCE: V221__schema_email_preauth_requests.sql =====



-- ===== BEGIN SOURCE: V223__link_preauth_to_email_request.sql =====

-- Add email_request_id to pre_authorizations
ALTER TABLE pre_authorizations ADD COLUMN email_request_id BIGINT;
ALTER TABLE pre_authorizations ADD CONSTRAINT fk_preauth_email_request FOREIGN KEY (email_request_id) REFERENCES pre_auth_email_requests(id);

-- ===== END SOURCE: V223__link_preauth_to_email_request.sql =====



-- ===== BEGIN SOURCE: V226__schema_claim_rejection_reasons.sql =====

-- V226: Claim Rejection Reasons lookup table
-- Predefined rejection reasons that can be selected or extended by users

CREATE TABLE IF NOT EXISTS claim_rejection_reasons (
    id          BIGSERIAL PRIMARY KEY,
    reason_text VARCHAR(500) NOT NULL,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_claim_rejection_reason_text UNIQUE (reason_text)
);

-- Seed predefined reasons
INSERT INTO claim_rejection_reasons (reason_text) VALUES
    ('تجاوز السعر المتفق عليه'),
    ('الخدمة غير مغطاة'),
    ('المستفيد استهلك رصيده')
ON CONFLICT DO NOTHING;

-- ===== END SOURCE: V226__schema_claim_rejection_reasons.sql =====



-- ===== BEGIN SOURCE: V239__align_live_claims_status_check.sql =====

ALTER TABLE claims
DROP CONSTRAINT IF EXISTS claims_status_check;

ALTER TABLE claims
ADD CONSTRAINT claims_status_check
CHECK (
    status IN (
        'DRAFT',
        'SUBMITTED',
        'UNDER_REVIEW',
        'NEEDS_CORRECTION',
        'APPROVAL_IN_PROGRESS',
        'APPROVED',
        'REJECTED',
        'BATCHED',
        'SETTLED'
    )
);

-- ===== END SOURCE: V239__align_live_claims_status_check.sql =====



-- ===== BEGIN SOURCE: V240__add_claim_soft_delete_metadata.sql =====

-- Add soft-delete metadata for claims deleted log
ALTER TABLE claims
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_claims_deleted_at ON claims (deleted_at);

-- ===== END SOURCE: V240__add_claim_soft_delete_metadata.sql =====



-- ===== BEGIN SOURCE: V242__fix_claim_number_nullable.sql =====

-- ============================================================
-- V37: جعل claim_number اختياري (يُولَّد بعد الإدراج من الـ ID)
-- claim_number was NOT NULL but the JPA entity never set it.
-- We drop NOT NULL so the first INSERT can succeed,
-- then the application updates it to 'CLM-{id}' immediately after.
-- The UNIQUE constraint is preserved.
-- ============================================================

ALTER TABLE claims ALTER COLUMN claim_number DROP NOT NULL;

-- ===== END SOURCE: V242__fix_claim_number_nullable.sql =====



-- ===== BEGIN SOURCE: V243__add_claim_full_coverage.sql =====

ALTER TABLE claims ADD COLUMN IF NOT EXISTS full_coverage BOOLEAN DEFAULT FALSE;

-- ===== END SOURCE: V243__add_claim_full_coverage.sql =====



-- ===== BEGIN SOURCE: V246__add_claim_line_refused_breakdown.sql =====

-- V41: Add refused-amount breakdown columns to claim_lines
--
-- price_excess_refused: portion refused because submitted price > contract price
--                       = max(0, requestedUnitPrice - contractPrice) × qty
-- limit_refused       : portion refused due to benefit limits (timesLimit / amountLimit)
--                       = max(0, clientRefused - priceExcessRefused)
--
-- Both default to 0 so existing rows remain valid.

ALTER TABLE claim_lines
    ADD COLUMN IF NOT EXISTS price_excess_refused DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS limit_refused         DECIMAL(15, 2) NOT NULL DEFAULT 0.00;

COMMENT ON COLUMN claim_lines.price_excess_refused IS
    'Amount refused because submitted unit price exceeded the contracted price';
COMMENT ON COLUMN claim_lines.limit_refused IS
    'Amount refused due to benefit limit enforcement (times-per-year or annual-amount caps)';

-- ===== END SOURCE: V246__add_claim_line_refused_breakdown.sql =====



-- ===== BEGIN SOURCE: V247__add_claim_soft_delete_fields.sql =====

-- V42: Add soft-delete audit fields to claims table
-- deleted_at: timestamp when the claim was soft-deleted
-- deleted_by: email/username of who performed the deletion

ALTER TABLE claims ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255);

-- Index for efficient listing of deleted claims
CREATE INDEX IF NOT EXISTS idx_claims_active_deleted ON claims (active, deleted_at DESC);

-- ===== END SOURCE: V247__add_claim_soft_delete_fields.sql =====

