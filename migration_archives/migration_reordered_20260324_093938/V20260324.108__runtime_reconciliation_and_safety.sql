-- Auto-generated consolidated migration copy
-- Source snapshot: D:\waad_sofyan_final\backend\src\main\resources\db\migration_archive_20260324_093938
-- Group: V20260324.108__runtime_reconciliation_and_safety.sql



-- ===== BEGIN SOURCE: V096__add_missing_columns.sql =====

-- ============================================================
-- V096: Add missing columns that were added to entities/V0xx
--       after the DB was already initialized.
--
-- All statements use IF NOT EXISTS so this migration is safe
-- to run even if the columns were later added manually.
-- ============================================================

-- 1. benefit_policies.out_of_pocket_max
--    Added to Claim / cost-calculation logic but missing from DB if V040
--    was applied before the column was added to the CREATE TABLE statement.
ALTER TABLE benefit_policies
    ADD COLUMN IF NOT EXISTS out_of_pocket_max DECIMAL(15, 2) DEFAULT 0.00;

-- 2. claims.active
--    Present in Claim.java entity (@Column name = "active") but never
--    included in V070__schema_claims.sql.
ALTER TABLE claims
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- 3. members.active
--    Present in Member.java entity and in V050, but guard in case the
--    DB was initialised from an older version of V050.
ALTER TABLE members
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- ===== END SOURCE: V096__add_missing_columns.sql =====



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



-- ===== BEGIN SOURCE: V099__fix_json_columns_to_text.sql =====

-- V099: Fix JSON columns mapped as String in Java entities.
-- PostgreSQL 'json' type requires explicit JDBC casting which fails with
-- standard Hibernate 6 String mapping. Changing to 'text' is lossless
-- (text stores any string including JSON) and avoids JDBC type mismatch.
ALTER TABLE feature_flags ALTER COLUMN role_filters TYPE TEXT USING role_filters::TEXT;
ALTER TABLE module_access ALTER COLUMN allowed_roles TYPE TEXT USING allowed_roles::TEXT;
ALTER TABLE module_access ALTER COLUMN required_permissions TYPE TEXT USING required_permissions::TEXT;

-- ===== END SOURCE: V099__fix_json_columns_to_text.sql =====



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



-- ===== BEGIN SOURCE: V107__allow_multiple_category_roots.sql =====

-- ============================================================
-- V107: Support Many-to-Many Roots for Medical Categories
-- ============================================================
-- Allows a sub-category (e.g. Lab) to belong to multiple roots (OP, IP, etc.)

CREATE TABLE IF NOT EXISTS medical_category_roots (
    category_id BIGINT NOT NULL,
    root_id     BIGINT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (category_id, root_id),
    CONSTRAINT fk_mcr_category FOREIGN KEY (category_id) REFERENCES medical_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_mcr_root     FOREIGN KEY (root_id)     REFERENCES medical_categories(id) ON DELETE CASCADE
);

-- Index for reverse lookup
CREATE INDEX IF NOT EXISTS idx_mcr_root_id ON medical_category_roots(root_id);

-- Migrate existing single parent_id to medical_category_roots
INSERT INTO medical_category_roots (category_id, root_id)
SELECT id, parent_id FROM medical_categories 
WHERE parent_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ===== END SOURCE: V107__allow_multiple_category_roots.sql =====



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



-- ===== BEGIN SOURCE: V111__drop_duplicate_provider_service_price_import_log.sql =====

-- ============================================================
-- V111: Drop duplicate provider_service_price_import_log table
-- ============================================================
-- The V030 schema correctly created the plural version 'provider_service_price_import_logs'.
-- A singular version 'provider_service_price_import_log' might have been created
-- due to JPA auto-ddl generation differences or older migrations. 
-- We drop the singular variant to remove ambiguity and duplication.

DROP TABLE IF EXISTS provider_service_price_import_log;

-- ===== END SOURCE: V111__drop_duplicate_provider_service_price_import_log.sql =====



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



-- ===== BEGIN SOURCE: V115__fix_provider_account_corrections.sql =====

-- =============================================================================
-- V115: Fix provider account balance corrections
-- =============================================================================
-- Business rule: Provider share = ROUND(approvedAmount × (1 - discountPercent), 2)
--   Company share (حصة الشركة)  = 10%   → ROUND(48.75 × 0.10, 2) = 4.88
--   Provider share (نصيب المرفق) = 90%  → ROUND(48.75 × 0.90, 2) = 43.88
--   Correction per claim = 48.75 − 43.88 = 4.87  (exact 2dp arithmetic)
--
-- Starting balance: 105.75 (before all corrections)
-- Corrections for provider_id=1 (دار الشفاء):
--   DEBIT 1: orphan CREDIT from deleted claim #18   → 8.25  → balance: 97.50
--   DEBIT 2: CLM-49 over-credit (48.75 − 43.88)    → 4.87  → balance: 92.63
--   DEBIT 3: CLM-50 over-credit (48.75 − 43.88)    → 4.87  → balance: 87.76
--   Total corrections: 17.99  →  final balance: 87.76
-- =============================================================================

DO $$
DECLARE
    v_account_id  BIGINT;
    v_curr_bal    NUMERIC(14,2);
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'provider_accounts'
          AND column_name = 'running_balance'
    ) OR NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'provider_accounts'
          AND column_name = 'total_approved'
    ) THEN
        RAISE NOTICE 'Skipping V115: provider_accounts uses legacy balance columns in this schema path.';
        RETURN;
    END IF;

    SELECT id, running_balance
      INTO v_account_id, v_curr_bal
      FROM provider_accounts
     WHERE provider_id = 1;

    IF v_account_id IS NULL THEN
        RAISE NOTICE 'No account for provider_id=1, skipping.';
        RETURN;
    END IF;

    IF v_curr_bal <> 105.75 THEN
        RAISE NOTICE 'Unexpected balance % (expected 105.75), skipping — already corrected?', v_curr_bal;
        RETURN;
    END IF;

    -- ---- Correction 1: reverse orphan credit from deleted claim #18 ----
    -- balance: 105.75 → 97.50  (105.75 − 8.25 = 97.50)
    INSERT INTO account_transactions (
        provider_account_id, transaction_type, amount,
        balance_before, balance_after,
        reference_type, reference_number,
        description, transaction_date
    ) VALUES (
        v_account_id, 'DEBIT', 8.25,
        105.75, 97.50,
        'ADJUSTMENT', 'CORR-ORPHAN-CLM18',
        'تصحيح: عكس اعتماد مطالبة #18 المحذوفة (حركة يتيمة)',
        CURRENT_DATE
    );

    -- ---- Correction 2: CLM-49 over-credit (provider share 43.88, not 48.75) ----
    -- balance: 97.50 → 92.63  (97.50 − 4.87 = 92.63)
    INSERT INTO account_transactions (
        provider_account_id, transaction_type, amount,
        balance_before, balance_after,
        reference_type, reference_id, reference_number,
        description, transaction_date
    ) VALUES (
        v_account_id, 'DEBIT', 4.87,
        97.50, 92.63,
        'ADJUSTMENT', 49, 'CORR-CLM49-DISCOUNT',
        'تصحيح: خصم حصة الشركة 10% من اعتماد CLM-49 (48.75 → 43.88)',
        CURRENT_DATE
    );

    -- ---- Correction 3: CLM-50 over-credit (provider share 43.88, not 48.75) ----
    -- balance: 92.63 → 87.76  (92.63 − 4.87 = 87.76)
    INSERT INTO account_transactions (
        provider_account_id, transaction_type, amount,
        balance_before, balance_after,
        reference_type, reference_id, reference_number,
        description, transaction_date
    ) VALUES (
        v_account_id, 'DEBIT', 4.87,
        92.63, 87.76,
        'ADJUSTMENT', 50, 'CORR-CLM50-DISCOUNT',
        'تصحيح: خصم حصة الشركة 10% من اعتماد CLM-50 (48.75 → 43.88)',
        CURRENT_DATE
    );

    -- ---- Update provider_accounts ----
    -- running_balance = total_approved - total_paid
    -- Reduce total_approved by 17.99 (sum of 3 correction debits)
    -- running_balance: 105.75 − 17.99 = 87.76
    UPDATE provider_accounts
       SET running_balance = 87.76,
           total_approved  = total_approved - 17.99,
           updated_at      = NOW()
     WHERE id = v_account_id;

    RAISE NOTICE 'V115 applied. New provider balance: 87.76';
END;
$$;

-- ===== END SOURCE: V115__fix_provider_account_corrections.sql =====



-- ===== BEGIN SOURCE: V118__drop_orphaned_tables.sql =====

-- ============================================================
-- V118: Drop orphaned tables and sequences
-- ============================================================
-- These objects belong to modules that have been fully removed from
-- the application (no Java entity, no controller, no service exists).
--
-- Modules removed:
--   * Provider Service Mapping Center (V031) → 3 tables
--   * Provider Payments (V081 partial) → 1 table (settlement_batch_id
--     column already dropped by V117; table itself still exists)
--
-- Orphaned sequences:
--   * settlement_payment_reference_seq — referenced only by the deleted
--     ProviderPayment payment_reference auto-generation logic.
--     (settlement_batch_seq was already dropped by V117)
-- ============================================================

-- ----------------------------------------------------------
-- 1. Drop Provider Mapping Center tables (V031)
--    Drop in FK-dependency order (children before parent).
-- ----------------------------------------------------------

-- provider_service_mappings FK → provider_raw_services
DROP TABLE IF EXISTS provider_service_mappings CASCADE;

-- provider_mapping_audit    FK → provider_raw_services (nullable, but safer)
DROP TABLE IF EXISTS provider_mapping_audit CASCADE;

-- provider_raw_services — parent of the two above
DROP TABLE IF EXISTS provider_raw_services CASCADE;

-- ----------------------------------------------------------
-- 2. Drop provider_payments (V081)
--    settlement_batch_id column already removed by V117.
--    No Java entity remains (ProviderPaymentController deleted).
-- ----------------------------------------------------------
DROP TABLE IF EXISTS provider_payments CASCADE;

-- ----------------------------------------------------------
-- 3. Drop orphaned sequence
-- ----------------------------------------------------------

-- settlement_payment_reference_seq was used only for payment_reference
-- auto-generation in the deleted ProviderPayment entity.
DROP SEQUENCE IF EXISTS settlement_payment_reference_seq;

-- ============================================================
-- NOTE: The following indexes from V090 already no longer exist
-- because they were auto-dropped when settlement_batches was
-- dropped by V117:
--   idx_settlement_batches_provider_date_status
--   idx_settlement_batch_payment
--   idx_settlements_active
--
-- No action required for them here.
-- ============================================================

-- ===== END SOURCE: V118__drop_orphaned_tables.sql =====



-- ===== BEGIN SOURCE: V200__consolidated_clean_baseline.sql =====

-- ============================================================
-- V200: Consolidated clean baseline schema
-- ============================================================
-- Purpose:
--   Clean, create-only baseline for fresh installations.
--   This migration folds historical ALTER patches into final CREATE shapes.
--
-- Rules:
--   * No ALTER TABLE statements
--   * No DROP statements
--   * Excludes removed/orphaned modules (provider mapping, provider payments,
--     settlement batch tables)
-- ============================================================

-- ----------------------------------------------------------
-- 1) Sequences
-- ----------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS user_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS employer_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS provider_seq START WITH 1 INCREMENT BY 50;

CREATE SEQUENCE IF NOT EXISTS medical_category_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS medical_service_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS medical_service_category_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS ent_service_alias_seq START WITH 1 INCREMENT BY 50;

CREATE SEQUENCE IF NOT EXISTS member_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS provider_contract_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS benefit_policy_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS claim_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS preauth_seq START WITH 1 INCREMENT BY 50;

-- ----------------------------------------------------------
-- 2) Core business master tables
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS employers (
    id BIGINT PRIMARY KEY DEFAULT nextval('employer_seq'),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,

    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),

    logo_url VARCHAR(500),
    website VARCHAR(200),
    business_type VARCHAR(100),
    tax_number VARCHAR(50),
    commercial_registration_number VARCHAR(50),

    -- Fields consolidated from V098
    cr_number VARCHAR(50),
    contract_start_date DATE,
    contract_end_date DATE,
    max_member_limit INTEGER,

    active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_employers_code ON employers(code);
CREATE INDEX IF NOT EXISTS idx_employers_active ON employers(active);
CREATE INDEX IF NOT EXISTS idx_employers_default ON employers(is_default) WHERE is_default = true;

CREATE TABLE IF NOT EXISTS providers (
    id BIGINT PRIMARY KEY DEFAULT nextval('provider_seq'),
    provider_name VARCHAR(255) NOT NULL,
    provider_name_ar VARCHAR(255),
    license_number VARCHAR(100) NOT NULL UNIQUE,
    provider_type VARCHAR(50) NOT NULL
        CHECK (provider_type IN ('HOSPITAL','CLINIC','PHARMACY','LAB','RADIOLOGY','OTHER')),

    contact_person VARCHAR(255),
    contact_email VARCHAR(255) UNIQUE,
    contact_phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),

    bank_name VARCHAR(255),
    bank_account_number VARCHAR(100),
    iban VARCHAR(50),

    allow_all_employers BOOLEAN DEFAULT false,
    tax_company_code VARCHAR(50),
    principal_name VARCHAR(255),
    principal_phone VARCHAR(50),
    principal_email VARCHAR(255),
    principal_mobile VARCHAR(50),
    principal_address TEXT,
    secondary_contact VARCHAR(255),
    secondary_contact_phone VARCHAR(50),
    secondary_contact_email VARCHAR(255),
    accounting_person VARCHAR(255),
    accounting_phone VARCHAR(50),
    accounting_email VARCHAR(255),
    provider_status VARCHAR(50),

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(provider_type) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_providers_active ON providers(active);
CREATE INDEX IF NOT EXISTS idx_providers_license ON providers(license_number);

CREATE TABLE IF NOT EXISTS provider_allowed_employers (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    employer_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),

    CONSTRAINT fk_allowed_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    CONSTRAINT fk_allowed_employer FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE CASCADE,
    CONSTRAINT uq_provider_employer UNIQUE (provider_id, employer_id)
);

CREATE INDEX IF NOT EXISTS idx_allowed_employers_provider ON provider_allowed_employers(provider_id);
CREATE INDEX IF NOT EXISTS idx_allowed_employers_employer ON provider_allowed_employers(employer_id);

CREATE TABLE IF NOT EXISTS provider_admin_documents (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(255),

    CONSTRAINT fk_provider_docs FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------
-- 3) Users and auth
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY DEFAULT nextval('user_seq'),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,

    user_type VARCHAR(50) NOT NULL DEFAULT 'DATA_ENTRY'
        CHECK (user_type IN (
            'SUPER_ADMIN','EMPLOYER_ADMIN','MEDICAL_REVIEWER',
            'PROVIDER_STAFF','ACCOUNTANT','FINANCE_VIEWER','DATA_ENTRY'
        )),

    employer_id BIGINT,
    provider_id BIGINT,
    company_id BIGINT,

    enabled BOOLEAN DEFAULT true,
    account_non_expired BOOLEAN DEFAULT true,
    account_non_locked BOOLEAN DEFAULT true,
    credentials_non_expired BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,

    can_view_claims BOOLEAN DEFAULT true,
    can_view_visits BOOLEAN DEFAULT true,
    can_view_reports BOOLEAN DEFAULT true,
    can_view_members BOOLEAN DEFAULT true,
    can_view_benefit_policies BOOLEAN DEFAULT true,

    identity_verified BOOLEAN DEFAULT false,
    identity_verified_at TIMESTAMP,
    identity_verified_by VARCHAR(255),

    phone VARCHAR(50),
    profile_image_url VARCHAR(500),

    password_changed_at TIMESTAMP,
    failed_login_count INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),

    CONSTRAINT fk_user_employer FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_user_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_enabled ON users(enabled);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_employer ON users(employer_id) WHERE employer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider_id) WHERE provider_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_email_verify_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_tokens_expiry ON email_verification_tokens(expiry_date);
CREATE INDEX IF NOT EXISTS idx_email_tokens_expires_at ON email_verification_tokens(expires_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_tokens_expiry ON password_reset_tokens(expiry_date);
CREATE INDEX IF NOT EXISTS idx_password_tokens_expires_at ON password_reset_tokens(expires_at);

CREATE TABLE IF NOT EXISTS user_login_attempts (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,

    attempt_result VARCHAR(20) DEFAULT 'SUCCESS'
        CHECK (attempt_result IN ('SUCCESS','FAILURE','LOCKED')),
    failure_reason VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    user_id BIGINT,
    success BOOLEAN DEFAULT false,
    failed_reason VARCHAR(255),
    attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON user_login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON user_login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_result ON user_login_attempts(attempt_result);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id_attempted ON user_login_attempts(user_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success_attempted ON user_login_attempts(success, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_failed ON user_login_attempts(username, attempted_at DESC)
    WHERE success = false;

CREATE TABLE IF NOT EXISTS user_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    username VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
    action_type VARCHAR(100) NOT NULL DEFAULT 'GENERIC',
    action_description TEXT,
    action VARCHAR(100),
    details TEXT,
    performed_by BIGINT,
    entity_type VARCHAR(100),
    entity_id BIGINT,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_username ON user_audit_log(username);
CREATE INDEX IF NOT EXISTS idx_audit_action_type ON user_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON user_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON user_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_audit_action_created ON user_audit_log(action_type, created_at DESC);

-- ----------------------------------------------------------
-- 4) System configuration
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
    id BIGSERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    value_type VARCHAR(20),
    description VARCHAR(500),
    category VARCHAR(50),
    is_editable BOOLEAN DEFAULT true,
    default_value TEXT,
    validation_rules TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_active ON system_settings(active) WHERE active = true;

CREATE TABLE IF NOT EXISTS feature_flags (
    id BIGSERIAL PRIMARY KEY,
    flag_key VARCHAR(100) NOT NULL UNIQUE,
    flag_name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    role_filters TEXT,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS module_access (
    id BIGSERIAL PRIMARY KEY,
    module_name VARCHAR(100) NOT NULL,
    module_key VARCHAR(100) NOT NULL,
    description TEXT,
    allowed_roles TEXT NOT NULL,
    required_permissions TEXT,
    feature_flag_key VARCHAR(100),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_module_access_module_key ON module_access(module_key);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id BIGINT,
    username VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id BIGINT,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

CREATE TABLE IF NOT EXISTS pdf_company_settings (
    id BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(512),
    logo_data BYTEA,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(255),
    footer_text TEXT,
    footer_text_en TEXT,
    header_color VARCHAR(7),
    footer_color VARCHAR(7),
    page_size VARCHAR(20),
    margin_top INTEGER,
    margin_bottom INTEGER,
    margin_left INTEGER,
    margin_right INTEGER,
    
    -- Claim Report Customization (Added in V210)
    claim_report_title VARCHAR(255),
    claim_report_primary_color VARCHAR(7),
    claim_report_intro TEXT,
    claim_report_footer_note TEXT,
    claim_report_sig_right_top VARCHAR(255),
    claim_report_sig_right_bottom VARCHAR(255),
    claim_report_sig_left_top VARCHAR(255),
    claim_report_sig_left_bottom VARCHAR(255),
    
    is_active BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- ----------------------------------------------------------
-- 5) Medical taxonomy
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS medical_categories (
    id BIGINT PRIMARY KEY DEFAULT nextval('medical_category_seq'),

    category_name VARCHAR(255) NOT NULL,
    category_name_ar VARCHAR(255),
    category_code VARCHAR(50) NOT NULL UNIQUE,

    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    name_en VARCHAR(200),
    parent_id BIGINT,

    context VARCHAR(20) NOT NULL DEFAULT 'ANY'
        CHECK (context IN ('INPATIENT','OUTPATIENT','OPERATING_ROOM','EMERGENCY','SPECIAL','ANY')),

    description TEXT,

    deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by BIGINT,

    active BOOLEAN DEFAULT true,
    coverage_percent DECIMAL(5,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),

    CONSTRAINT fk_medical_category_parent FOREIGN KEY (parent_id)
        REFERENCES medical_categories(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_medical_categories_code ON medical_categories(code);
CREATE INDEX IF NOT EXISTS idx_medical_categories_active ON medical_categories(active);
CREATE INDEX IF NOT EXISTS idx_medical_categories_parent_id ON medical_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_medical_categories_deleted ON medical_categories(deleted) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_medical_categories_deleted_code ON medical_categories(deleted, code);

CREATE TABLE IF NOT EXISTS medical_category_roots (
    category_id BIGINT NOT NULL,
    root_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (category_id, root_id),
    CONSTRAINT fk_mcr_category FOREIGN KEY (category_id) REFERENCES medical_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_mcr_root FOREIGN KEY (root_id) REFERENCES medical_categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mcr_root_id ON medical_category_roots(root_id);

CREATE TABLE IF NOT EXISTS medical_specialties (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_medical_specialties_deleted ON medical_specialties(deleted) WHERE deleted = false;

CREATE TABLE IF NOT EXISTS medical_services (
    id BIGINT PRIMARY KEY DEFAULT nextval('medical_service_seq'),

    category_id BIGINT,
    specialty_id BIGINT,

    service_name VARCHAR(255),
    service_name_ar VARCHAR(255),
    service_code VARCHAR(50) UNIQUE,

    name VARCHAR(255),
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    code VARCHAR(50),

    status VARCHAR(20) DEFAULT 'ACTIVE',
    description TEXT,

    base_price NUMERIC(10,2),
    cost NUMERIC(15,2),

    is_master BOOLEAN NOT NULL DEFAULT false,
    requires_pa BOOLEAN NOT NULL DEFAULT false,

    deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by BIGINT,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),

    CONSTRAINT fk_medical_service_category FOREIGN KEY (category_id)
        REFERENCES medical_categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_medical_service_specialty FOREIGN KEY (specialty_id)
        REFERENCES medical_specialties(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_medical_services_category ON medical_services(category_id);
CREATE INDEX IF NOT EXISTS idx_medical_services_code ON medical_services(service_code);
CREATE INDEX IF NOT EXISTS idx_medical_services_active ON medical_services(active);
CREATE INDEX IF NOT EXISTS idx_medical_services_is_master ON medical_services(is_master) WHERE deleted = false;
CREATE UNIQUE INDEX IF NOT EXISTS uq_medical_services_code_active ON medical_services(code)
    WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_medical_services_category_deleted_active ON medical_services(category_id, deleted, active);
CREATE INDEX IF NOT EXISTS idx_medical_services_active_deleted ON medical_services(active, deleted);
CREATE INDEX IF NOT EXISTS idx_medical_services_code_lower ON medical_services(LOWER(code));
CREATE INDEX IF NOT EXISTS idx_medical_services_name_ar_lower ON medical_services(LOWER(name_ar));
CREATE INDEX IF NOT EXISTS idx_medical_services_name_en_lower ON medical_services(LOWER(name_en));

CREATE TABLE IF NOT EXISTS medical_service_categories (
    id BIGINT PRIMARY KEY DEFAULT nextval('medical_service_category_seq'),
    service_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    context VARCHAR(20) NOT NULL DEFAULT 'ANY'
        CHECK (context IN ('OUTPATIENT','INPATIENT','EMERGENCY','ANY')),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),

    CONSTRAINT fk_msc_service FOREIGN KEY (service_id) REFERENCES medical_services(id) ON DELETE CASCADE,
    CONSTRAINT fk_msc_category FOREIGN KEY (category_id) REFERENCES medical_categories(id) ON DELETE RESTRICT,
    CONSTRAINT uq_msc_primary_per_context UNIQUE (service_id, context, is_primary)
        DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_msc_service_id ON medical_service_categories(service_id);
CREATE INDEX IF NOT EXISTS idx_msc_category_id ON medical_service_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_msc_context ON medical_service_categories(context);
CREATE INDEX IF NOT EXISTS idx_medical_svc_categories_category ON medical_service_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_medical_svc_categories_composite ON medical_service_categories(category_id, service_id);

CREATE TABLE IF NOT EXISTS ent_service_aliases (
    id BIGINT PRIMARY KEY DEFAULT nextval('ent_service_alias_seq'),
    medical_service_id BIGINT NOT NULL,
    alias_text VARCHAR(255) NOT NULL,
    locale VARCHAR(10) NOT NULL DEFAULT 'ar',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),

    CONSTRAINT fk_alias_service FOREIGN KEY (medical_service_id)
        REFERENCES medical_services(id) ON DELETE CASCADE,
    CONSTRAINT uq_alias_text_per_service_locale UNIQUE (medical_service_id, alias_text, locale)
);

CREATE INDEX IF NOT EXISTS idx_aliases_service_id ON ent_service_aliases(medical_service_id);
CREATE INDEX IF NOT EXISTS idx_aliases_text ON ent_service_aliases(alias_text);
CREATE INDEX IF NOT EXISTS idx_aliases_locale ON ent_service_aliases(locale);
CREATE INDEX IF NOT EXISTS idx_ent_service_aliases_text_lower ON ent_service_aliases(LOWER(alias_text));
CREATE INDEX IF NOT EXISTS idx_ent_service_aliases_service_id ON ent_service_aliases(medical_service_id);

CREATE TABLE IF NOT EXISTS cpt_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    description VARCHAR(500) NOT NULL,
    category VARCHAR(100),
    sub_category VARCHAR(100),
    procedure_type VARCHAR(20),
    standard_price NUMERIC(15,2),
    max_allowed_price NUMERIC(15,2),
    min_allowed_price NUMERIC(15,2),
    covered BOOLEAN DEFAULT true,
    co_payment_percentage NUMERIC(5,2),
    requires_pre_auth BOOLEAN DEFAULT false,
    notes VARCHAR(2000),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS icd_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    description VARCHAR(500) NOT NULL,
    category VARCHAR(50),
    sub_category VARCHAR(100),
    version VARCHAR(20),
    notes VARCHAR(2000),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- ----------------------------------------------------------
-- 6) Provider service directory and reviewer assignments
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_services (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_provider_services_provider FOREIGN KEY (provider_id)
        REFERENCES providers(id) ON DELETE CASCADE,
    CONSTRAINT unique_provider_service UNIQUE (provider_id, service_code)
);

CREATE INDEX IF NOT EXISTS idx_provider_services_provider ON provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_code ON provider_services(service_code);
CREATE INDEX IF NOT EXISTS idx_provider_services_active ON provider_services(active);

CREATE TABLE IF NOT EXISTS medical_reviewer_providers (
    id BIGSERIAL PRIMARY KEY,
    reviewer_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),

    CONSTRAINT fk_mrp_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_mrp_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    CONSTRAINT uk_reviewer_provider UNIQUE (reviewer_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_mrp_reviewer_id ON medical_reviewer_providers(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_mrp_provider_id ON medical_reviewer_providers(provider_id);
CREATE INDEX IF NOT EXISTS idx_mrp_active ON medical_reviewer_providers(active);

CREATE TABLE IF NOT EXISTS provider_service_price_import_logs (
    id BIGSERIAL PRIMARY KEY,
    import_batch_id VARCHAR(64) NOT NULL UNIQUE,
    provider_id BIGINT NOT NULL,
    provider_code VARCHAR(100) NOT NULL,
    provider_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    import_mode VARCHAR(20) NOT NULL DEFAULT 'REPLACE',
    total_rows INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING',
    error_details JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    processing_time_ms BIGINT,
    imported_by_user_id BIGINT,
    imported_by_username VARCHAR(100),
    created_at TIMESTAMP
);

-- ----------------------------------------------------------
-- 7) Benefit policies and contracts
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS benefit_policies (
    id BIGINT PRIMARY KEY DEFAULT nextval('benefit_policy_seq'),
    policy_name VARCHAR(255) NOT NULL,
    policy_code VARCHAR(50) NOT NULL UNIQUE,
    employer_id BIGINT NOT NULL,

    name VARCHAR(255),

    annual_limit NUMERIC(12,2),
    per_visit_limit NUMERIC(10,2),
    deductible_amount NUMERIC(10,2),
    copay_percentage NUMERIC(5,2),
    annual_deductible DECIMAL(15,2) DEFAULT 0.00,
    out_of_pocket_max DECIMAL(15,2) DEFAULT 0.00,

    per_member_limit NUMERIC(15,2),
    per_family_limit NUMERIC(15,2),

    policy_type VARCHAR(50) CHECK (policy_type IN ('BASIC','PREMIUM','EXECUTIVE','CUSTOM')),
    description TEXT,
    notes VARCHAR(1000),

    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE')),
    start_date DATE,
    end_date DATE,
    effective_date DATE NOT NULL,
    expiry_date DATE,

    default_coverage_percent INTEGER DEFAULT 80,
    default_waiting_period_days INTEGER DEFAULT 0,
    covered_members_count INTEGER DEFAULT 0,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),

    CONSTRAINT fk_policy_employer FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE RESTRICT,
    CONSTRAINT chk_policy_dates CHECK (expiry_date IS NULL OR expiry_date >= effective_date)
);

CREATE INDEX IF NOT EXISTS idx_policies_code ON benefit_policies(policy_code);
CREATE INDEX IF NOT EXISTS idx_policies_employer ON benefit_policies(employer_id);
CREATE INDEX IF NOT EXISTS idx_policies_type ON benefit_policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_policies_active ON benefit_policies(active);
CREATE INDEX IF NOT EXISTS idx_policies_start_date ON benefit_policies(start_date);
CREATE INDEX IF NOT EXISTS idx_policies_end_date ON benefit_policies(end_date);

CREATE TABLE IF NOT EXISTS benefit_policy_rules (
    id BIGSERIAL PRIMARY KEY,
    benefit_policy_id BIGINT NOT NULL,

    service_category VARCHAR(100),
    medical_category_id BIGINT,
    medical_service_id BIGINT,

    coverage_percentage NUMERIC(5,2),
    coverage_percent INTEGER,
    max_sessions_per_year INTEGER,
    times_limit INTEGER,
    requires_preauth BOOLEAN DEFAULT false,
    requires_pre_approval BOOLEAN DEFAULT false,
    waiting_period_days INTEGER,

    max_amount_per_session NUMERIC(10,2),
    max_amount_per_year NUMERIC(12,2),
    amount_limit NUMERIC(15,2),

    notes VARCHAR(500),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),

    CONSTRAINT fk_rule_policy FOREIGN KEY (benefit_policy_id) REFERENCES benefit_policies(id) ON DELETE CASCADE,
    CONSTRAINT fk_rule_service FOREIGN KEY (medical_service_id) REFERENCES medical_services(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_bpr_policy ON benefit_policy_rules(benefit_policy_id);
CREATE INDEX IF NOT EXISTS idx_bpr_category ON benefit_policy_rules(medical_category_id);
CREATE INDEX IF NOT EXISTS idx_bpr_service ON benefit_policy_rules(medical_service_id);
CREATE INDEX IF NOT EXISTS idx_bpr_active ON benefit_policy_rules(active);

CREATE TABLE IF NOT EXISTS provider_contracts (
    id BIGINT PRIMARY KEY DEFAULT nextval('provider_contract_seq'),
    provider_id BIGINT NOT NULL,
    employer_id BIGINT NOT NULL,
    contract_number VARCHAR(100) NOT NULL UNIQUE,

    contract_start_date DATE NOT NULL,
    contract_end_date DATE,
    discount_percent NUMERIC(5,2),
    payment_terms VARCHAR(100),

    max_sessions_per_service INTEGER,
    requires_preauthorization BOOLEAN DEFAULT false,

    contract_status VARCHAR(50)
        CHECK (contract_status IN ('DRAFT','ACTIVE','EXPIRED','TERMINATED')),
    active BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'DRAFT',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),

    CONSTRAINT fk_contract_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_contract_employer FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE RESTRICT,
    CONSTRAINT chk_contract_dates CHECK (contract_end_date IS NULL OR contract_end_date >= contract_start_date)
);

CREATE INDEX IF NOT EXISTS idx_contracts_provider ON provider_contracts(provider_id);
CREATE INDEX IF NOT EXISTS idx_contracts_employer ON provider_contracts(employer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON provider_contracts(contract_status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_contract_per_provider ON provider_contracts(provider_id)
    WHERE contract_status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_provider_contracts_active ON provider_contracts(active);
CREATE INDEX IF NOT EXISTS idx_provider_contracts_expiring ON provider_contracts(contract_end_date)
    WHERE active = true AND contract_end_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS provider_contract_pricing_items (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL,
    medical_service_id BIGINT,
    service_category VARCHAR(100),
    unit_price NUMERIC(15,2) NOT NULL,
    effective_from DATE,
    effective_to DATE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),

    CONSTRAINT fk_pricing_contract FOREIGN KEY (contract_id) REFERENCES provider_contracts(id) ON DELETE CASCADE,
    CONSTRAINT fk_pricing_service FOREIGN KEY (medical_service_id) REFERENCES medical_services(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS network_providers (
    id BIGSERIAL PRIMARY KEY,
    employer_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    network_tier VARCHAR(50) CHECK (network_tier IN ('TIER_1','TIER_2','TIER_3','OUT_OF_NETWORK')),
    effective_date DATE NOT NULL,
    expiry_date DATE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),

    CONSTRAINT fk_network_employer FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_network_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_network_provider ON network_providers(employer_id, provider_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_network_employer ON network_providers(employer_id);
CREATE INDEX IF NOT EXISTS idx_network_provider ON network_providers(provider_id);
CREATE INDEX IF NOT EXISTS idx_network_tier ON network_providers(network_tier);

CREATE TABLE IF NOT EXISTS legacy_provider_contracts (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    contract_price NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'LYD',
    effective_from DATE NOT NULL,
    effective_to DATE,
    active BOOLEAN DEFAULT true,
    notes VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_legacy_contract_service_date
    ON legacy_provider_contracts(provider_id, service_code, effective_from);
CREATE INDEX IF NOT EXISTS idx_legacy_contracts_provider ON legacy_provider_contracts(provider_id);
CREATE INDEX IF NOT EXISTS idx_legacy_contracts_service ON legacy_provider_contracts(service_code);
CREATE INDEX IF NOT EXISTS idx_legacy_contracts_active ON legacy_provider_contracts(active);

-- ----------------------------------------------------------
-- 8) Members
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
    id BIGINT PRIMARY KEY DEFAULT nextval('member_seq'),
    member_card_id VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    full_name_ar VARCHAR(255),
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('MALE','FEMALE')),
    national_id VARCHAR(50),

    employer_id BIGINT,
    employee_id VARCHAR(100),
    employee_number VARCHAR(100),
    membership_type VARCHAR(50) CHECK (membership_type IN ('PRIMARY','DEPENDENT')),
    relation_to_employee VARCHAR(50),
    relationship VARCHAR(50),
    parent_id BIGINT,

    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    coverage_start_date DATE,
    coverage_end_date DATE,
    policy_number VARCHAR(100),
    start_date DATE,
    end_date DATE,
    join_date DATE,

    benefit_policy_id BIGINT,

    barcode VARCHAR(100),
    birth_date DATE,
    card_number VARCHAR(50),
    card_status VARCHAR(30),
    card_activated_at TIMESTAMP,
    is_smart_card BOOLEAN DEFAULT false,
    civil_id VARCHAR(50),
    national_number VARCHAR(50),

    photo_url VARCHAR(500),
    profile_photo_path VARCHAR(500),
    marital_status VARCHAR(20),
    nationality VARCHAR(100),
    occupation VARCHAR(100),
    notes TEXT,
    emergency_notes TEXT,

    is_vip BOOLEAN DEFAULT false,
    is_urgent BOOLEAN DEFAULT false,
    blocked_reason VARCHAR(500),

    status VARCHAR(30) DEFAULT 'ACTIVE',
    eligibility_status VARCHAR(30),
    eligibility_updated_at TIMESTAMP,

    version BIGINT DEFAULT 0,

    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),

    CONSTRAINT fk_member_employer FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_member_policy FOREIGN KEY (benefit_policy_id) REFERENCES benefit_policies(id) ON DELETE SET NULL,
    CONSTRAINT fk_member_parent FOREIGN KEY (parent_id) REFERENCES members(id) ON DELETE SET NULL,
    CONSTRAINT chk_coverage_dates CHECK (coverage_end_date IS NULL OR coverage_end_date >= coverage_start_date)
);

CREATE INDEX IF NOT EXISTS idx_members_card_id ON members(member_card_id);
CREATE INDEX IF NOT EXISTS idx_members_employer ON members(employer_id);
CREATE INDEX IF NOT EXISTS idx_members_national_id ON members(national_id);
CREATE INDEX IF NOT EXISTS idx_members_active ON members(active);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_parent_id ON members(parent_id);
CREATE INDEX IF NOT EXISTS idx_members_barcode ON members(barcode);
CREATE INDEX IF NOT EXISTS idx_members_card_number ON members(card_number);
CREATE INDEX IF NOT EXISTS idx_members_civil_id ON members(civil_id);
CREATE INDEX IF NOT EXISTS idx_members_benefit_policy ON members(benefit_policy_id);
CREATE INDEX IF NOT EXISTS idx_members_employer_active ON members(employer_id, active)
    WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_members_employer_search ON members(employer_id, civil_id, full_name)
    WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_members_employer_active_report ON members(employer_id)
    WHERE active = true;

CREATE TABLE IF NOT EXISTS member_attributes (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    attribute_code VARCHAR(100) NOT NULL,
    attribute_value TEXT,
    source VARCHAR(50),
    source_reference VARCHAR(200),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,

    CONSTRAINT fk_member_attrs_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT uk_member_attribute_code UNIQUE (member_id, attribute_code)
);

CREATE INDEX IF NOT EXISTS idx_member_attributes_member ON member_attributes(member_id);
CREATE INDEX IF NOT EXISTS idx_member_attributes_code ON member_attributes(attribute_code);

CREATE TABLE IF NOT EXISTS member_deductibles (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    deductible_year INTEGER NOT NULL,
    total_deductible NUMERIC(10,2) DEFAULT 0.00,
    deductible_used NUMERIC(10,2) DEFAULT 0.00,
    deductible_remaining NUMERIC(10,2) DEFAULT 0.00,
    version BIGINT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),

    CONSTRAINT fk_deductible_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    CONSTRAINT uq_member_deductible_year UNIQUE (member_id, deductible_year),
    CONSTRAINT chk_deductible_math CHECK (deductible_remaining = total_deductible - deductible_used),
    CONSTRAINT chk_deductible_non_negative CHECK (deductible_used >= 0 AND deductible_remaining >= 0)
);

CREATE INDEX IF NOT EXISTS idx_deductibles_member ON member_deductibles(member_id);
CREATE INDEX IF NOT EXISTS idx_deductibles_year ON member_deductibles(deductible_year);
CREATE INDEX IF NOT EXISTS idx_deductibles_near_limit ON member_deductibles(member_id, deductible_year)
    WHERE deductible_used >= total_deductible * 0.8;

CREATE TABLE IF NOT EXISTS member_policy_assignments (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    policy_id BIGINT NOT NULL,
    assignment_start_date DATE NOT NULL,
    assignment_end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),

    CONSTRAINT fk_assignment_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    CONSTRAINT fk_assignment_policy FOREIGN KEY (policy_id) REFERENCES benefit_policies(id) ON DELETE RESTRICT,
    CONSTRAINT chk_assignment_dates CHECK (assignment_end_date IS NULL OR assignment_end_date >= assignment_start_date)
);

CREATE INDEX IF NOT EXISTS idx_policy_assignments_member ON member_policy_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_policy_assignments_policy ON member_policy_assignments(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_assignments_dates ON member_policy_assignments(assignment_start_date, assignment_end_date);

CREATE TABLE IF NOT EXISTS member_import_logs (
    id BIGSERIAL PRIMARY KEY,
    import_batch_id VARCHAR(64) NOT NULL UNIQUE,
    file_name VARCHAR(500),
    file_size_bytes BIGINT,

    total_rows INTEGER DEFAULT 0,
    created_count INTEGER DEFAULT 0,
    updated_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,

    status VARCHAR(30) DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','VALIDATING','PROCESSING','COMPLETED','PARTIAL','FAILED')),
    error_message TEXT,

    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    processing_time_ms BIGINT,

    imported_by_user_id BIGINT,
    imported_by_username VARCHAR(100),
    company_scope_id BIGINT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_member_import_logs_batch ON member_import_logs(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_member_import_logs_status ON member_import_logs(status);
CREATE INDEX IF NOT EXISTS idx_member_import_logs_user ON member_import_logs(imported_by_user_id)
    WHERE imported_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_member_import_logs_created ON member_import_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS member_import_errors (
    id BIGSERIAL PRIMARY KEY,
    import_log_id BIGINT NOT NULL,
    row_number INTEGER NOT NULL,
    row_data JSONB,
    error_type VARCHAR(50),
    error_field VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMP,

    CONSTRAINT fk_import_errors_log FOREIGN KEY (import_log_id)
        REFERENCES member_import_logs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_import_errors_log_id ON member_import_errors(import_log_id);
CREATE INDEX IF NOT EXISTS idx_import_errors_row_number ON member_import_errors(row_number);
CREATE INDEX IF NOT EXISTS idx_import_errors_error_type ON member_import_errors(error_type);

-- ----------------------------------------------------------
-- 9) Visits, eligibility, preauthorization
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS visits (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    employer_id BIGINT,
    provider_id BIGINT,

    medical_category_id BIGINT,
    medical_category_name VARCHAR(200),
    medical_service_id BIGINT,
    medical_service_code VARCHAR(50),
    medical_service_name VARCHAR(200),

    doctor_name VARCHAR(255),
    specialty VARCHAR(100),
    visit_date DATE NOT NULL,
    diagnosis TEXT,
    treatment TEXT,
    total_amount NUMERIC(10,2),
    notes TEXT,

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

    eligibility_check_id BIGINT,

    version BIGINT DEFAULT 0,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_visit_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    CONSTRAINT fk_visit_employer FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE RESTRICT,
    CONSTRAINT chk_visit_date_reasonable CHECK (
        visit_date <= CURRENT_DATE AND visit_date >= CURRENT_DATE - INTERVAL '10 years'
    )
);

CREATE INDEX IF NOT EXISTS idx_visits_member ON visits(member_id);
CREATE INDEX IF NOT EXISTS idx_visits_employer ON visits(employer_id);
CREATE INDEX IF NOT EXISTS idx_visits_provider ON visits(provider_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_member_date ON visits(member_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_provider_date ON visits(provider_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_category ON visits(medical_category_id) WHERE medical_category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visits_service ON visits(medical_service_id) WHERE medical_service_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS visit_attachments (
    id BIGSERIAL PRIMARY KEY,
    visit_id BIGINT NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    original_file_name VARCHAR(500),
    file_key VARCHAR(500),
    file_type VARCHAR(100),
    file_size BIGINT,
    attachment_type VARCHAR(50)
        CHECK (attachment_type IN ('XRAY','MRI','CT_SCAN','LAB_RESULT','PRESCRIPTION','MEDICAL_REPORT','OTHER')),
    description TEXT,
    uploaded_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_visit_attachment FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_visit_attachments_visit ON visit_attachments(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_attachments_type ON visit_attachments(attachment_type);
CREATE INDEX IF NOT EXISTS idx_visit_attachments_visit_date ON visit_attachments(visit_id, created_at DESC);

CREATE TABLE IF NOT EXISTS eligibility_checks (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,

    check_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_eligible BOOLEAN NOT NULL,
    eligibility_reason TEXT,
    policy_id BIGINT,
    coverage_status VARCHAR(50),
    visit_id BIGINT,
    checked_by VARCHAR(255),

    request_id VARCHAR(36) NOT NULL UNIQUE,
    check_timestamp TIMESTAMP NOT NULL,
    provider_id BIGINT,
    service_date DATE NOT NULL,
    service_code VARCHAR(50),
    eligible BOOLEAN NOT NULL,
    status VARCHAR(50) NOT NULL,
    reasons TEXT,
    member_name VARCHAR(255),
    member_civil_id VARCHAR(50),
    member_status VARCHAR(30),
    policy_number VARCHAR(100),
    policy_status VARCHAR(30),
    policy_start_date DATE,
    policy_end_date DATE,
    employer_id BIGINT,
    employer_name VARCHAR(255),
    checked_by_user_id BIGINT,
    checked_by_username VARCHAR(100),
    company_scope_id BIGINT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    processing_time_ms INTEGER,
    rules_evaluated INTEGER,
    created_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_eligibility_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    CONSTRAINT fk_eligibility_policy FOREIGN KEY (policy_id) REFERENCES benefit_policies(id) ON DELETE RESTRICT,
    CONSTRAINT uk_eligibility_request_id UNIQUE (request_id)
);

CREATE INDEX IF NOT EXISTS idx_eligibility_member ON eligibility_checks(member_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_date ON eligibility_checks(check_date DESC);
CREATE INDEX IF NOT EXISTS idx_eligibility_status ON eligibility_checks(status);
CREATE INDEX IF NOT EXISTS idx_eligibility_request_id ON eligibility_checks(request_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_policy_id ON eligibility_checks(policy_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_member_date ON eligibility_checks(member_id, check_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_eligibility_service_date ON eligibility_checks(service_date DESC);
CREATE INDEX IF NOT EXISTS idx_eligibility_scope ON eligibility_checks(company_scope_id);

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
-- 11) Financial ledger (provider account model)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_accounts (
    id BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL UNIQUE,
    running_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_approved NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_paid NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','SUSPENDED','CLOSED')),
    last_transaction_at TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_account_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    CONSTRAINT chk_balance_non_negative CHECK (running_balance >= 0)
);

CREATE TABLE IF NOT EXISTS account_transactions (
    id BIGSERIAL PRIMARY KEY,
    provider_account_id BIGINT NOT NULL,

    transaction_type VARCHAR(20) NOT NULL
        CHECK (transaction_type IN ('CREDIT','DEBIT')),
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    balance_before NUMERIC(15,2) NOT NULL,
    balance_after NUMERIC(15,2) NOT NULL,

    reference_type VARCHAR(50) NOT NULL
        CHECK (reference_type IN ('CLAIM_APPROVAL','SETTLEMENT_PAYMENT','ADJUSTMENT')),
    reference_id BIGINT,
    reference_number VARCHAR(100),

    description VARCHAR(500),
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,

    CONSTRAINT fk_transaction_account FOREIGN KEY (provider_account_id)
        REFERENCES provider_accounts(id) ON DELETE RESTRICT,
    CONSTRAINT chk_balance_credit CHECK (
        transaction_type <> 'CREDIT' OR balance_after = balance_before + amount
    ),
    CONSTRAINT chk_balance_debit CHECK (
        transaction_type <> 'DEBIT' OR balance_after = balance_before - amount
    ),
    CONSTRAINT chk_transaction_balance_non_negative CHECK (balance_before >= 0 AND balance_after >= 0)
);

CREATE INDEX IF NOT EXISTS idx_transactions_account ON account_transactions(provider_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON account_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON account_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON account_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON account_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_date ON account_transactions(provider_account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_reporting ON account_transactions(transaction_date, transaction_type, amount);
CREATE INDEX IF NOT EXISTS idx_account_transactions_provider_date ON account_transactions(provider_account_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_reporting_full ON account_transactions(transaction_date, transaction_type, amount);

-- ----------------------------------------------------------
-- 12) Extra performance indexes from legacy V090
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_preauth_member_status_date
    ON preauthorization_requests(member_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_preauth_expiring
    ON preauthorization_requests(valid_until)
    WHERE status = 'APPROVED' AND valid_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_preauth_provider_date_status
    ON preauthorization_requests(provider_id, created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_login_attempts_failed_window
    ON user_login_attempts(username, attempted_at DESC)
    WHERE success = false;

-- NOTE: settlement_batches/provider_payments related indexes intentionally
-- omitted because those tables were removed from the system.

-- ===== END SOURCE: V200__consolidated_clean_baseline.sql =====



-- ===== BEGIN SOURCE: V227__reconcile_legacy_runtime_schema.sql =====

-- Reconcile legacy table layouts with the current entity model.
-- This is needed for databases that had pre-V200 tables, where V200 used
-- CREATE TABLE IF NOT EXISTS and therefore did not reshape existing tables.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'providers'
    ) THEN
        ALTER TABLE providers ADD COLUMN IF NOT EXISTS name VARCHAR(200);
        ALTER TABLE providers ADD COLUMN IF NOT EXISTS email VARCHAR(100);
        ALTER TABLE providers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
        ALTER TABLE providers ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50);
        ALTER TABLE providers ADD COLUMN IF NOT EXISTS network_status VARCHAR(20);
        ALTER TABLE providers ADD COLUMN IF NOT EXISTS contract_start_date DATE;
        ALTER TABLE providers ADD COLUMN IF NOT EXISTS contract_end_date DATE;
        ALTER TABLE providers ADD COLUMN IF NOT EXISTS default_discount_rate NUMERIC(5,2);

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'providers' AND column_name = 'provider_name'
        ) THEN
            UPDATE providers
            SET name = COALESCE(name, NULLIF(provider_name_ar, ''), provider_name),
                email = COALESCE(email, contact_email),
                phone = COALESCE(phone, contact_phone),
                tax_number = COALESCE(tax_number, tax_company_code),
                network_status = COALESCE(
                    network_status,
                    CASE
                        WHEN provider_status IN ('IN_NETWORK', 'OUT_OF_NETWORK', 'PREFERRED') THEN provider_status
                        ELSE NULL
                    END
                )
            WHERE name IS NULL
               OR email IS NULL
               OR phone IS NULL
               OR tax_number IS NULL
               OR network_status IS NULL;

            EXECUTE $provider_fn$
                CREATE OR REPLACE FUNCTION sync_provider_legacy_columns()
                RETURNS trigger
                LANGUAGE plpgsql
                AS $body$
                BEGIN
                    NEW.name := COALESCE(NEW.name, NULLIF(NEW.provider_name_ar, ''), NEW.provider_name);
                    NEW.provider_name := COALESCE(NEW.provider_name, NEW.name);
                    NEW.provider_name_ar := COALESCE(NEW.provider_name_ar, NEW.name);

                    NEW.email := COALESCE(NEW.email, NEW.contact_email);
                    NEW.contact_email := COALESCE(NEW.contact_email, NEW.email);

                    NEW.phone := COALESCE(NEW.phone, NEW.contact_phone);
                    NEW.contact_phone := COALESCE(NEW.contact_phone, NEW.phone);

                    NEW.tax_number := COALESCE(NEW.tax_number, NEW.tax_company_code);
                    NEW.tax_company_code := COALESCE(NEW.tax_company_code, NEW.tax_number);

                    NEW.network_status := COALESCE(
                        NEW.network_status,
                        CASE
                            WHEN NEW.provider_status IN ('IN_NETWORK', 'OUT_OF_NETWORK', 'PREFERRED') THEN NEW.provider_status
                            ELSE NULL
                        END
                    );

                    IF NEW.provider_status IS NULL AND NEW.network_status IS NOT NULL THEN
                        NEW.provider_status := NEW.network_status;
                    END IF;

                    RETURN NEW;
                END;
                $body$;
            $provider_fn$;

            DROP TRIGGER IF EXISTS trg_sync_provider_legacy_columns ON providers;
            CREATE TRIGGER trg_sync_provider_legacy_columns
                BEFORE INSERT OR UPDATE ON providers
                FOR EACH ROW
                EXECUTE FUNCTION sync_provider_legacy_columns();
        END IF;
    END IF;
END $$;

DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'provider_contracts'
    ) THEN
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS contract_code VARCHAR(50);
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS start_date DATE;
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS end_date DATE;
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS signed_date DATE;
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(20);
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS discount_rate NUMERIC(5,2);
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS total_value NUMERIC(15,2);
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT FALSE;
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100);
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS contact_email VARCHAR(100);
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS notes VARCHAR(2000);

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'provider_contracts' AND column_name = 'contract_start_date'
        ) THEN
            ALTER TABLE provider_contracts ALTER COLUMN employer_id DROP NOT NULL;
            ALTER TABLE provider_contracts ALTER COLUMN contract_number DROP NOT NULL;
            ALTER TABLE provider_contracts ALTER COLUMN contract_start_date DROP NOT NULL;

            FOR constraint_record IN
                SELECT conname
                FROM pg_constraint
                WHERE conrelid = 'provider_contracts'::regclass
                  AND contype = 'c'
                  AND pg_get_constraintdef(oid) ILIKE '%contract_status%'
            LOOP
                EXECUTE format('ALTER TABLE provider_contracts DROP CONSTRAINT %I', constraint_record.conname);
            END LOOP;

            UPDATE provider_contracts
            SET contract_code = COALESCE(contract_code, NULLIF(contract_number, ''), CONCAT('PC-', id)),
                contract_number = COALESCE(contract_number, contract_code, CONCAT('PC-', id)),
                start_date = COALESCE(start_date, contract_start_date),
                end_date = COALESCE(end_date, contract_end_date),
                signed_date = COALESCE(signed_date, start_date, contract_start_date),
                status = COALESCE(status, contract_status, 'DRAFT'),
                contract_status = COALESCE(contract_status, status, 'DRAFT'),
                pricing_model = COALESCE(pricing_model, 'DISCOUNT'),
                discount_rate = COALESCE(discount_rate, discount_percent),
                currency = COALESCE(currency, 'LYD'),
                auto_renew = COALESCE(auto_renew, FALSE)
            WHERE contract_code IS NULL
               OR start_date IS NULL
               OR status IS NULL
               OR pricing_model IS NULL
               OR currency IS NULL
               OR auto_renew IS NULL;

            EXECUTE $contract_fn$
                CREATE OR REPLACE FUNCTION sync_provider_contract_legacy_columns()
                RETURNS trigger
                LANGUAGE plpgsql
                AS $body$
                BEGIN
                    NEW.contract_code := COALESCE(NEW.contract_code, NULLIF(NEW.contract_number, ''), CONCAT('PC-', COALESCE(NEW.id, 0)));
                    NEW.contract_number := COALESCE(NEW.contract_number, NEW.contract_code);

                    NEW.start_date := COALESCE(NEW.start_date, NEW.contract_start_date);
                    NEW.contract_start_date := COALESCE(NEW.contract_start_date, NEW.start_date);

                    NEW.end_date := COALESCE(NEW.end_date, NEW.contract_end_date);
                    NEW.contract_end_date := COALESCE(NEW.contract_end_date, NEW.end_date);

                    NEW.status := COALESCE(NEW.status, NEW.contract_status, 'DRAFT');
                    NEW.contract_status := COALESCE(NEW.contract_status, NEW.status, 'DRAFT');

                    NEW.pricing_model := COALESCE(NEW.pricing_model, 'DISCOUNT');
                    NEW.discount_rate := COALESCE(NEW.discount_rate, NEW.discount_percent);
                    NEW.currency := COALESCE(NEW.currency, 'LYD');
                    NEW.auto_renew := COALESCE(NEW.auto_renew, FALSE);
                    NEW.signed_date := COALESCE(NEW.signed_date, NEW.start_date, NEW.contract_start_date);

                    RETURN NEW;
                END;
                $body$;
            $contract_fn$;

            DROP TRIGGER IF EXISTS trg_sync_provider_contract_legacy_columns ON provider_contracts;
            CREATE TRIGGER trg_sync_provider_contract_legacy_columns
                BEFORE INSERT OR UPDATE ON provider_contracts
                FOR EACH ROW
                EXECUTE FUNCTION sync_provider_contract_legacy_columns();
        END IF;

        CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_contracts_contract_code
            ON provider_contracts(contract_code)
            WHERE contract_code IS NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'visits'
    ) THEN
        ALTER TABLE visits ADD COLUMN IF NOT EXISTS complaint TEXT;
        ALTER TABLE visits ADD COLUMN IF NOT EXISTS network_status VARCHAR(30);

        UPDATE visits
        SET network_status = COALESCE(network_status, 'IN_NETWORK')
        WHERE network_status IS NULL;
    END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS member_barcode_seq START WITH 1 INCREMENT BY 1;

DO $$
DECLARE
    max_barcode_seq BIGINT;
BEGIN
    SELECT COALESCE(MAX(CAST(substring(barcode FROM '([0-9]+)$') AS BIGINT)), 0)
    INTO max_barcode_seq
    FROM members
    WHERE barcode IS NOT NULL
      AND barcode ~ '[0-9]+$';

    IF max_barcode_seq = 0 THEN
        PERFORM setval('member_barcode_seq', 1, FALSE);
    ELSE
        PERFORM setval('member_barcode_seq', max_barcode_seq, TRUE);
    END IF;
END $$;

-- ===== END SOURCE: V227__reconcile_legacy_runtime_schema.sql =====



-- ===== BEGIN SOURCE: V228__reconcile_benefit_policy_runtime_schema.sql =====

-- Reconcile legacy benefit_policies layout with the current entity model.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'benefit_policies'
    ) THEN
        ALTER TABLE benefit_policies ADD COLUMN IF NOT EXISTS name VARCHAR(255);
        ALTER TABLE benefit_policies ADD COLUMN IF NOT EXISTS start_date DATE;
        ALTER TABLE benefit_policies ADD COLUMN IF NOT EXISTS end_date DATE;

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'benefit_policies' AND column_name = 'policy_name'
        ) THEN
            UPDATE benefit_policies
            SET name = COALESCE(name, policy_name),
                policy_name = COALESCE(policy_name, name),
                start_date = COALESCE(start_date, effective_date),
                effective_date = COALESCE(effective_date, start_date),
                end_date = COALESCE(end_date, expiry_date),
                expiry_date = COALESCE(expiry_date, end_date)
            WHERE name IS NULL
               OR policy_name IS NULL
               OR start_date IS NULL
               OR effective_date IS NULL
               OR end_date IS NULL
               OR expiry_date IS NULL;

            EXECUTE $policy_fn$
                CREATE OR REPLACE FUNCTION sync_benefit_policy_legacy_columns()
                RETURNS trigger
                LANGUAGE plpgsql
                AS $body$
                BEGIN
                    NEW.name := COALESCE(NEW.name, NEW.policy_name);
                    NEW.policy_name := COALESCE(NEW.policy_name, NEW.name);

                    NEW.start_date := COALESCE(NEW.start_date, NEW.effective_date);
                    NEW.effective_date := COALESCE(NEW.effective_date, NEW.start_date);

                    NEW.end_date := COALESCE(NEW.end_date, NEW.expiry_date);
                    NEW.expiry_date := COALESCE(NEW.expiry_date, NEW.end_date);

                    RETURN NEW;
                END;
                $body$;
            $policy_fn$;

            DROP TRIGGER IF EXISTS trg_sync_benefit_policy_legacy_columns ON benefit_policies;
            CREATE TRIGGER trg_sync_benefit_policy_legacy_columns
                BEFORE INSERT OR UPDATE ON benefit_policies
                FOR EACH ROW
                EXECUTE FUNCTION sync_benefit_policy_legacy_columns();
        END IF;
    END IF;
END $$;

-- ===== END SOURCE: V228__reconcile_benefit_policy_runtime_schema.sql =====



-- ===== BEGIN SOURCE: V229__reconcile_member_runtime_schema.sql =====

-- Reconcile legacy members layout with the current unified member entity.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'members'
    ) THEN
        ALTER TABLE members ALTER COLUMN member_card_id DROP NOT NULL;
        ALTER TABLE members ALTER COLUMN date_of_birth DROP NOT NULL;

        UPDATE members
        SET member_card_id = COALESCE(member_card_id, card_number, barcode),
            card_number = COALESCE(card_number, member_card_id),
            birth_date = COALESCE(birth_date, date_of_birth),
            date_of_birth = COALESCE(date_of_birth, birth_date),
            national_number = COALESCE(national_number, national_id),
            national_id = COALESCE(national_id, national_number),
            coverage_start_date = COALESCE(coverage_start_date, start_date),
            coverage_end_date = COALESCE(coverage_end_date, end_date),
            membership_type = COALESCE(membership_type, CASE WHEN parent_id IS NULL THEN 'PRIMARY' ELSE 'DEPENDENT' END),
            relation_to_employee = COALESCE(relation_to_employee, relationship)
        WHERE member_card_id IS NULL
           OR card_number IS NULL
           OR birth_date IS NULL
           OR date_of_birth IS NULL
           OR national_number IS NULL
           OR national_id IS NULL
           OR coverage_start_date IS NULL
           OR coverage_end_date IS NULL
           OR membership_type IS NULL
           OR relation_to_employee IS NULL;

        EXECUTE $member_fn$
            CREATE OR REPLACE FUNCTION sync_member_legacy_columns()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $body$
            BEGIN
                NEW.member_card_id := COALESCE(NEW.member_card_id, NEW.card_number, NEW.barcode);
                NEW.card_number := COALESCE(NEW.card_number, NEW.member_card_id);

                NEW.birth_date := COALESCE(NEW.birth_date, NEW.date_of_birth);
                NEW.date_of_birth := COALESCE(NEW.date_of_birth, NEW.birth_date);

                NEW.national_number := COALESCE(NEW.national_number, NEW.national_id);
                NEW.national_id := COALESCE(NEW.national_id, NEW.national_number);

                NEW.coverage_start_date := COALESCE(NEW.coverage_start_date, NEW.start_date);
                NEW.coverage_end_date := COALESCE(NEW.coverage_end_date, NEW.end_date);

                NEW.membership_type := COALESCE(
                    NEW.membership_type,
                    CASE WHEN NEW.parent_id IS NULL THEN 'PRIMARY' ELSE 'DEPENDENT' END
                );
                NEW.relation_to_employee := COALESCE(NEW.relation_to_employee, NEW.relationship);

                RETURN NEW;
            END;
            $body$;
        $member_fn$;

        DROP TRIGGER IF EXISTS trg_sync_member_legacy_columns ON members;
        CREATE TRIGGER trg_sync_member_legacy_columns
            BEFORE INSERT OR UPDATE ON members
            FOR EACH ROW
            EXECUTE FUNCTION sync_member_legacy_columns();
    END IF;
END $$;

-- ===== END SOURCE: V229__reconcile_member_runtime_schema.sql =====



-- ===== BEGIN SOURCE: V230__reconcile_provider_allowed_employers_schema.sql =====

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

-- ===== END SOURCE: V230__reconcile_provider_allowed_employers_schema.sql =====



-- ===== BEGIN SOURCE: V231__reconcile_provider_contract_pricing_items_schema.sql =====

-- Reconcile legacy provider_contract_pricing_items layout with the current entity.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'provider_contract_pricing_items'
    ) THEN
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS service_name VARCHAR(255);
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS service_code VARCHAR(50);
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS category_name VARCHAR(255);
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS medical_category_id BIGINT;
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS base_price NUMERIC(15,2);
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS contract_price NUMERIC(15,2);
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2);
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS notes VARCHAR(2000);
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'provider_contract_pricing_items' AND column_name = 'service_category'
        ) THEN
            UPDATE provider_contract_pricing_items
            SET category_name = COALESCE(category_name, service_category),
                base_price = COALESCE(base_price, unit_price, 0),
                contract_price = COALESCE(contract_price, unit_price, 0),
                discount_percent = COALESCE(discount_percent, 0),
                quantity = COALESCE(quantity, 0),
                unit = COALESCE(unit, 'service'),
                currency = COALESCE(currency, 'LYD')
            WHERE category_name IS NULL
               OR base_price IS NULL
               OR contract_price IS NULL
               OR discount_percent IS NULL
               OR quantity IS NULL
               OR unit IS NULL
               OR currency IS NULL;

            EXECUTE $pricing_fn$
                CREATE OR REPLACE FUNCTION sync_provider_contract_pricing_legacy_columns()
                RETURNS trigger
                LANGUAGE plpgsql
                AS $body$
                BEGIN
                    NEW.category_name := COALESCE(NEW.category_name, NEW.service_category);
                    NEW.service_category := COALESCE(NEW.service_category, NEW.category_name);

                    NEW.base_price := COALESCE(NEW.base_price, NEW.unit_price, 0);
                    NEW.contract_price := COALESCE(NEW.contract_price, NEW.unit_price, NEW.base_price, 0);
                    NEW.unit_price := COALESCE(NEW.unit_price, NEW.contract_price, NEW.base_price, 0);

                    NEW.discount_percent := COALESCE(NEW.discount_percent, 0);
                    NEW.quantity := COALESCE(NEW.quantity, 0);
                    NEW.unit := COALESCE(NEW.unit, 'service');
                    NEW.currency := COALESCE(NEW.currency, 'LYD');

                    RETURN NEW;
                END;
                $body$;
            $pricing_fn$;

            DROP TRIGGER IF EXISTS trg_sync_provider_contract_pricing_legacy_columns ON provider_contract_pricing_items;
            CREATE TRIGGER trg_sync_provider_contract_pricing_legacy_columns
                BEFORE INSERT OR UPDATE ON provider_contract_pricing_items
                FOR EACH ROW
                EXECUTE FUNCTION sync_provider_contract_pricing_legacy_columns();
        END IF;
    END IF;
END $$;

-- ===== END SOURCE: V231__reconcile_provider_contract_pricing_items_schema.sql =====



-- ===== BEGIN SOURCE: V235__reconcile_medical_services_schema.sql =====

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

-- ===== END SOURCE: V235__reconcile_medical_services_schema.sql =====



-- ===== BEGIN SOURCE: V236__reconcile_medical_service_categories_schema.sql =====

ALTER TABLE medical_service_categories
    ADD COLUMN IF NOT EXISTS active BOOLEAN;

UPDATE medical_service_categories
SET active = TRUE
WHERE active IS NULL;

ALTER TABLE medical_service_categories
    ALTER COLUMN active SET DEFAULT TRUE;

ALTER TABLE medical_service_categories
    ALTER COLUMN active SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_msc_active
    ON medical_service_categories(active);

-- ===== END SOURCE: V236__reconcile_medical_service_categories_schema.sql =====



-- ===== BEGIN SOURCE: V237__reconcile_provider_accounts_ledger_schema.sql =====

ALTER TABLE provider_accounts
    ADD COLUMN IF NOT EXISTS running_balance NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS total_approved NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS total_paid NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS last_transaction_at TIMESTAMP;

DO $$
DECLARE
    has_legacy_current_balance BOOLEAN;
    has_legacy_total_payable BOOLEAN;
    duplicate_provider_count BIGINT;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'provider_accounts'
          AND column_name = 'current_balance'
    ) INTO has_legacy_current_balance;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'provider_accounts'
          AND column_name = 'total_payable'
    ) INTO has_legacy_total_payable;

    IF has_legacy_current_balance AND has_legacy_total_payable THEN
        EXECUTE $sql$
        WITH ledger_sums AS (
            SELECT
                provider_account_id,
                COALESCE(SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount ELSE 0 END), 0) AS total_credits,
                COALESCE(SUM(CASE WHEN transaction_type = 'DEBIT' THEN amount ELSE 0 END), 0) AS total_debits,
                COALESCE(SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount ELSE -amount END), 0) AS running_balance,
                MAX(COALESCE(created_at, transaction_date::timestamp)) AS last_transaction_at
            FROM account_transactions
            GROUP BY provider_account_id
        )
        UPDATE provider_accounts pa
        SET running_balance = COALESCE(ls.running_balance, COALESCE(pa.current_balance, 0), 0),
            total_approved = COALESCE(
                ls.total_credits,
                GREATEST(COALESCE(pa.total_payable, 0), COALESCE(pa.current_balance, 0)),
                0
            ),
            total_paid = COALESCE(
                ls.total_debits,
                GREATEST(
                    GREATEST(COALESCE(pa.total_payable, 0), COALESCE(pa.current_balance, 0)) - COALESCE(pa.current_balance, 0),
                    0
                ),
                0
            ),
            status = COALESCE(NULLIF(pa.status, ''), 'ACTIVE'),
            last_transaction_at = COALESCE(ls.last_transaction_at, pa.updated_at, pa.created_at, CURRENT_TIMESTAMP),
            version = COALESCE(pa.version, 0),
            created_at = COALESCE(pa.created_at, CURRENT_TIMESTAMP),
            updated_at = COALESCE(pa.updated_at, CURRENT_TIMESTAMP)
        FROM ledger_sums ls
        WHERE pa.id = ls.provider_account_id;
        $sql$;

        EXECUTE $sql$
        UPDATE provider_accounts pa
        SET running_balance = COALESCE(pa.running_balance, COALESCE(pa.current_balance, 0), 0),
            total_approved = COALESCE(
                pa.total_approved,
                GREATEST(COALESCE(pa.total_payable, 0), COALESCE(pa.current_balance, 0)),
                0
            ),
            total_paid = COALESCE(
                pa.total_paid,
                GREATEST(
                    GREATEST(COALESCE(pa.total_payable, 0), COALESCE(pa.current_balance, 0)) - COALESCE(pa.current_balance, 0),
                    0
                ),
                0
            ),
            status = COALESCE(NULLIF(pa.status, ''), 'ACTIVE'),
            last_transaction_at = COALESCE(pa.last_transaction_at, pa.updated_at, pa.created_at, CURRENT_TIMESTAMP),
            version = COALESCE(pa.version, 0),
            created_at = COALESCE(pa.created_at, CURRENT_TIMESTAMP),
            updated_at = COALESCE(pa.updated_at, CURRENT_TIMESTAMP)
        WHERE NOT EXISTS (
            SELECT 1
            FROM account_transactions atx
            WHERE atx.provider_account_id = pa.id
        );
        $sql$;
    ELSE
        UPDATE provider_accounts pa
        SET running_balance = COALESCE(pa.running_balance, 0),
            total_approved = COALESCE(pa.total_approved, pa.running_balance, 0),
            total_paid = COALESCE(pa.total_paid, GREATEST(COALESCE(pa.total_approved, 0) - COALESCE(pa.running_balance, 0), 0), 0),
            status = COALESCE(NULLIF(pa.status, ''), 'ACTIVE'),
            last_transaction_at = COALESCE(
                pa.last_transaction_at,
                (
                    SELECT MAX(COALESCE(atx.created_at, atx.transaction_date::timestamp))
                    FROM account_transactions atx
                    WHERE atx.provider_account_id = pa.id
                ),
                pa.updated_at,
                pa.created_at,
                CURRENT_TIMESTAMP
            ),
            version = COALESCE(pa.version, 0),
            created_at = COALESCE(pa.created_at, CURRENT_TIMESTAMP),
            updated_at = COALESCE(pa.updated_at, CURRENT_TIMESTAMP)
        WHERE pa.running_balance IS NULL
           OR pa.total_approved IS NULL
           OR pa.total_paid IS NULL
           OR pa.status IS NULL
           OR pa.last_transaction_at IS NULL
           OR pa.created_at IS NULL
           OR pa.updated_at IS NULL
           OR pa.version IS NULL;
    END IF;

    SELECT COUNT(*)
    INTO duplicate_provider_count
    FROM (
        SELECT provider_id
        FROM provider_accounts
        GROUP BY provider_id
        HAVING COUNT(*) > 1
    ) duplicate_accounts;

    IF duplicate_provider_count = 0 THEN
        CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_accounts_provider_id
            ON provider_accounts(provider_id);
    ELSE
        RAISE NOTICE 'Skipping unique index uq_provider_accounts_provider_id because duplicate provider accounts exist.';
    END IF;
END;
$$;

ALTER TABLE provider_accounts
    ALTER COLUMN running_balance SET DEFAULT 0.00,
    ALTER COLUMN total_approved SET DEFAULT 0.00,
    ALTER COLUMN total_paid SET DEFAULT 0.00,
    ALTER COLUMN status SET DEFAULT 'ACTIVE',
    ALTER COLUMN version SET DEFAULT 0,
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN running_balance SET NOT NULL,
    ALTER COLUMN total_approved SET NOT NULL,
    ALTER COLUMN total_paid SET NOT NULL,
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN version SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'provider_accounts'::regclass
          AND conname = 'chk_provider_accounts_running_balance_non_negative'
    ) THEN
        ALTER TABLE provider_accounts
            ADD CONSTRAINT chk_provider_accounts_running_balance_non_negative
            CHECK (running_balance >= 0);
    END IF;
END;
$$;

ALTER TABLE account_transactions
    DROP CONSTRAINT IF EXISTS account_transactions_reference_type_check;

ALTER TABLE account_transactions
    ADD CONSTRAINT account_transactions_reference_type_check
    CHECK (reference_type IN ('CLAIM_APPROVAL', 'SETTLEMENT_PAYMENT', 'CLAIM_SETTLEMENT', 'ADJUSTMENT'));

-- ===== END SOURCE: V237__reconcile_provider_accounts_ledger_schema.sql =====



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

