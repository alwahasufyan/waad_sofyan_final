-- Auto-generated consolidated migration copy (deduplicated)
-- Group: V20260324.101__core_identity_and_system.sql



-- ===== BEGIN SOURCE: V001__sequences.sql =====

-- ============================================================
-- V001: All application sequences (created before any tables)
-- ============================================================

-- Core entities
CREATE SEQUENCE IF NOT EXISTS user_seq              START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS employer_seq          START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS provider_seq          START WITH 1 INCREMENT BY 50;

-- Medical catalog
CREATE SEQUENCE IF NOT EXISTS medical_category_seq  START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS medical_service_seq   START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS medical_service_category_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS ent_service_alias_seq START WITH 1 INCREMENT BY 50;

-- Business entities
CREATE SEQUENCE IF NOT EXISTS member_seq            START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS provider_contract_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS benefit_policy_seq    START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS claim_seq             START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS preauth_seq           START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS settlement_batch_seq  START WITH 1 INCREMENT BY 50;

-- Payment reference (auto-incremented payment ref numbers)
CREATE SEQUENCE IF NOT EXISTS settlement_payment_reference_seq
    START WITH 10001 INCREMENT BY 1;

-- ===== END SOURCE: V001__sequences.sql =====



-- ===== BEGIN SOURCE: V005__schema_employers.sql =====

-- ============================================================
-- V005: Employers (main business customers)
-- ============================================================
-- No external dependencies.

CREATE TABLE IF NOT EXISTS employers (
    id                              BIGINT PRIMARY KEY DEFAULT nextval('employer_seq'),
    code                            VARCHAR(50)  NOT NULL UNIQUE,
    name                            VARCHAR(200) NOT NULL,

    -- Contact information
    address                         TEXT,
    phone                           VARCHAR(50),
    email                           VARCHAR(255),

    -- Branding & identity
    logo_url                        VARCHAR(500),
    website                         VARCHAR(200),
    business_type                   VARCHAR(100),
    tax_number                      VARCHAR(50),
    commercial_registration_number  VARCHAR(50),

    -- Status
    active                          BOOLEAN DEFAULT true,
    is_default                      BOOLEAN DEFAULT false,

    -- Audit
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_employers_code    ON employers(code);
CREATE INDEX IF NOT EXISTS idx_employers_active  ON employers(active);
CREATE INDEX IF NOT EXISTS idx_employers_default ON employers(is_default) WHERE is_default = true;

-- ===== END SOURCE: V005__schema_employers.sql =====



-- ===== BEGIN SOURCE: V010__schema_users.sql =====

-- ============================================================
-- V010: Users (authentication + profile)
-- ============================================================
-- Depends on: V005 (employers), V006 (providers)

CREATE TABLE IF NOT EXISTS users (
    id          BIGINT PRIMARY KEY DEFAULT nextval('user_seq'),
    username    VARCHAR(255) NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    full_name   VARCHAR(255) NOT NULL,

    -- User type (flattened RBAC — replaces dynamic roles/permissions)
    user_type VARCHAR(50) NOT NULL DEFAULT 'DATA_ENTRY'
        CHECK (user_type IN (
            'SUPER_ADMIN','EMPLOYER_ADMIN','MEDICAL_REVIEWER',
            'PROVIDER_STAFF','ACCOUNTANT','FINANCE_VIEWER','DATA_ENTRY'
        )),

    -- Organizational relationships
    employer_id BIGINT,
    provider_id BIGINT,
    company_id  BIGINT,

    -- Account status flags
    enabled                     BOOLEAN DEFAULT true,
    account_non_expired         BOOLEAN DEFAULT true,
    account_non_locked          BOOLEAN DEFAULT true,
    credentials_non_expired     BOOLEAN DEFAULT true,
    is_active                   BOOLEAN DEFAULT true,
    email_verified              BOOLEAN DEFAULT false,

    -- Module-level permission overrides (legacy columns — kept for compatibility)
    can_view_claims             BOOLEAN DEFAULT true,
    can_view_visits             BOOLEAN DEFAULT true,
    can_view_reports            BOOLEAN DEFAULT true,
    can_view_members            BOOLEAN DEFAULT true,
    can_view_benefit_policies   BOOLEAN DEFAULT true,

    -- Identity verification
    identity_verified       BOOLEAN DEFAULT false,
    identity_verified_at    TIMESTAMP,
    identity_verified_by    VARCHAR(255),

    -- Extended profile
    phone               VARCHAR(50),
    profile_image_url   VARCHAR(500),

    -- Security tracking
    password_changed_at     TIMESTAMP,
    failed_login_count      INTEGER DEFAULT 0,
    locked_until            TIMESTAMP,
    last_login_at           TIMESTAMP,

    -- Audit
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login  TIMESTAMP,
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255),

    CONSTRAINT fk_user_employer FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_user_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type     ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_enabled  ON users(enabled);
CREATE INDEX IF NOT EXISTS idx_users_active   ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_employer ON users(employer_id) WHERE employer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider_id) WHERE provider_id IS NOT NULL;

-- ===== END SOURCE: V010__schema_users.sql =====



-- ===== BEGIN SOURCE: V011__schema_auth_tokens.sql =====

-- ============================================================
-- V011: Authentication tokens (email verification + password reset)
-- ============================================================
-- Depends on: V010 (users)

-- ----------------------------------------------------------
-- SECTION 1: Email verification tokens
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id          BIGSERIAL PRIMARY KEY,
    token       VARCHAR(255) NOT NULL UNIQUE,
    user_id     BIGINT NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    verified    BOOLEAN DEFAULT false,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_email_verify_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_user      ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_token     ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_tokens_expiry    ON email_verification_tokens(expiry_date);
CREATE INDEX IF NOT EXISTS idx_email_tokens_expires_at ON email_verification_tokens(expires_at);

-- ----------------------------------------------------------
-- SECTION 2: Password reset tokens
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          BIGSERIAL PRIMARY KEY,
    token       VARCHAR(255) NOT NULL UNIQUE,
    user_id     BIGINT NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    used        BOOLEAN DEFAULT false,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_tokens_user      ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_tokens_token     ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_tokens_expiry    ON password_reset_tokens(expiry_date);
CREATE INDEX IF NOT EXISTS idx_password_tokens_expires_at ON password_reset_tokens(expires_at);

-- ===== END SOURCE: V011__schema_auth_tokens.sql =====



-- ===== BEGIN SOURCE: V012__schema_login_audit.sql =====

-- ============================================================
-- V012: Login attempts and user audit log
-- ============================================================
-- Depends on: V010 (users)

-- ----------------------------------------------------------
-- SECTION 1: Login attempt tracking (security)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_login_attempts (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(255) NOT NULL,
    ip_address      VARCHAR(50),
    user_agent      TEXT,

    -- Legacy result columns
    attempt_result  VARCHAR(20) DEFAULT 'SUCCESS'
        CHECK (attempt_result IN ('SUCCESS','FAILURE','LOCKED')),
    failure_reason  VARCHAR(500),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Runtime columns (synced with above via trigger)
    user_id         BIGINT,
    success         BOOLEAN DEFAULT false,
    failed_reason   VARCHAR(255),
    attempted_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger keeps attempt_result / success / created_at / attempted_at in sync
CREATE OR REPLACE FUNCTION trg_sync_login_attempt_result_fn()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.attempt_result IS NOT NULL AND NEW.success IS NULL THEN
        NEW.success := (NEW.attempt_result = 'SUCCESS');
    ELSIF NEW.success IS NOT NULL AND NEW.attempt_result IS NULL THEN
        NEW.attempt_result := CASE WHEN NEW.success THEN 'SUCCESS' ELSE 'FAILURE' END;
    END IF;
    IF NEW.attempted_at IS NULL THEN NEW.attempted_at := COALESCE(NEW.created_at, CURRENT_TIMESTAMP); END IF;
    IF NEW.created_at   IS NULL THEN NEW.created_at   := NEW.attempted_at; END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_login_attempt_result ON user_login_attempts;
CREATE TRIGGER trg_sync_login_attempt_result
    BEFORE INSERT OR UPDATE ON user_login_attempts
    FOR EACH ROW EXECUTE FUNCTION trg_sync_login_attempt_result_fn();

CREATE INDEX IF NOT EXISTS idx_login_attempts_username          ON user_login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created           ON user_login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_result            ON user_login_attempts(attempt_result);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id_attempted ON user_login_attempts(user_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success_attempted ON user_login_attempts(success, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_failed            ON user_login_attempts(username, attempted_at DESC)
    WHERE success = false;

-- ----------------------------------------------------------
-- SECTION 2: User audit log (generic entity change history)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_audit_log (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT,

    -- Legacy columns
    username            VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
    action_type         VARCHAR(100) NOT NULL DEFAULT 'GENERIC',
    action_description  TEXT,

    -- Runtime columns (synced via trigger)
    action          VARCHAR(100),
    details         TEXT,
    performed_by    BIGINT,

    entity_type     VARCHAR(100),
    entity_id       BIGINT,
    old_value       TEXT,
    new_value       TEXT,
    ip_address      VARCHAR(50),
    user_agent      TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE OR REPLACE FUNCTION trg_sync_user_audit_log_fn()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.action IS NULL THEN NEW.action := NEW.action_type; END IF;
    IF NEW.action_type IS NULL THEN NEW.action_type := NEW.action; END IF;
    IF NEW.details IS NULL THEN NEW.details := NEW.action_description; END IF;
    IF NEW.action_description IS NULL THEN NEW.action_description := NEW.details; END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_audit_log ON user_audit_log;
CREATE TRIGGER trg_sync_user_audit_log
    BEFORE INSERT OR UPDATE ON user_audit_log
    FOR EACH ROW EXECUTE FUNCTION trg_sync_user_audit_log_fn();

CREATE INDEX IF NOT EXISTS idx_audit_user         ON user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_username     ON user_audit_log(username);
CREATE INDEX IF NOT EXISTS idx_audit_action_type  ON user_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_entity       ON user_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created      ON user_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_audit_action_created ON user_audit_log(action_type, created_at DESC);

-- ===== END SOURCE: V012__schema_login_audit.sql =====



-- ===== BEGIN SOURCE: V015__schema_system_config.sql =====

-- ============================================================
-- V015: System configuration tables
-- ============================================================
-- Depends on: nothing (standalone config),
--   module_access references feature_flags (same file, created first)

-- ----------------------------------------------------------
-- SECTION 1: System settings (key-value store)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
    id               BIGSERIAL PRIMARY KEY,
    setting_key      VARCHAR(100) NOT NULL UNIQUE,
    setting_value    TEXT,
    value_type       VARCHAR(20),
    description      VARCHAR(500),
    category         VARCHAR(50),
    is_editable      BOOLEAN DEFAULT true,
    default_value    TEXT,
    validation_rules TEXT,
    active           BOOLEAN DEFAULT true,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by       VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key    ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_active ON system_settings(active) WHERE active = true;

-- ----------------------------------------------------------
-- SECTION 2: Feature flags (runtime feature toggles)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_flags (
    id          BIGSERIAL PRIMARY KEY,
    flag_key    VARCHAR(100) NOT NULL UNIQUE,
    flag_name   VARCHAR(255) NOT NULL,
    description TEXT,
    enabled     BOOLEAN DEFAULT true,
    role_filters JSON,
    created_by  VARCHAR(50),
    updated_by  VARCHAR(50),
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP
);

-- ----------------------------------------------------------
-- SECTION 3: Module access control (RBAC augmentation)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS module_access (
    id                  BIGSERIAL PRIMARY KEY,
    module_name         VARCHAR(100) NOT NULL,
    module_key          VARCHAR(100) NOT NULL,
    description         TEXT,
    allowed_roles       JSON NOT NULL,
    required_permissions JSON,
    feature_flag_key    VARCHAR(100),
    active              BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_module_access_module_key ON module_access(module_key);

-- ----------------------------------------------------------
-- SECTION 4: System-level audit log
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    timestamp   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id     BIGINT,
    username    VARCHAR(50),
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   BIGINT,
    details     TEXT,
    ip_address  VARCHAR(45),
    user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user      ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity    ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- ----------------------------------------------------------
-- SECTION 5: PDF company branding settings
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS pdf_company_settings (
    id              BIGSERIAL PRIMARY KEY,
    company_name    VARCHAR(255) NOT NULL,
    logo_url        VARCHAR(512),
    logo_data       BYTEA,
    address         TEXT,
    phone           VARCHAR(50),
    email           VARCHAR(100),
    website         VARCHAR(255),
    footer_text     TEXT,
    footer_text_en  TEXT,
    header_color    VARCHAR(7),
    footer_color    VARCHAR(7),
    page_size       VARCHAR(20),
    margin_top      INTEGER,
    margin_bottom   INTEGER,
    margin_left     INTEGER,
    margin_right    INTEGER,
    is_active       BOOLEAN,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100)
);

-- ===== END SOURCE: V015__schema_system_config.sql =====



-- ===== BEGIN SOURCE: V095__seed_feature_flags.sql =====

-- ============================================================
-- V095: Seed data — feature flags + configurable system settings
-- ============================================================
-- Depends on: V015 (system_settings, feature_flags tables)

-- ----------------------------------------------------------
-- SECTION 1: Feature flags — claim entry mode toggles
-- ----------------------------------------------------------
INSERT INTO feature_flags (flag_key, flag_name, description, enabled, created_by, created_at, updated_at)
VALUES
    (
        'PROVIDER_PORTAL_ENABLED',
        'بوابة الخدمة المباشرة',
        'تفعيل بوابة إدخال المطالبات المباشرة عبر مزودي الخدمة. عند التعطيل يعمل النظام في وضع الدفعات الشهرية فقط.',
        false, 'SYSTEM', NOW(), NOW()
    ),
    (
        'DIRECT_CLAIM_SUBMISSION_ENABLED',
        'التقديم المباشر للمطالبات',
        'السماح بإنشاء مطالبات فردية مباشرة من بوابة المزود. يتطلب تفعيل PROVIDER_PORTAL_ENABLED أيضاً.',
        false, 'SYSTEM', NOW(), NOW()
    ),
    (
        'BATCH_CLAIMS_ENABLED',
        'نظام الدفعات الشهرية',
        'تفعيل إدخال المطالبات عبر الدفعات الشهرية. هذا هو المسار الأساسي الحالي لإدخال المطالبات.',
        true, 'SYSTEM', NOW(), NOW()
    )
ON CONFLICT (flag_key) DO NOTHING;

-- ----------------------------------------------------------
-- SECTION 2: System settings — UI / appearance
-- ----------------------------------------------------------
INSERT INTO system_settings (setting_key, setting_value, value_type, description, category, is_editable, default_value, validation_rules, active, created_at, updated_at)
VALUES
    ('LOGO_URL',        '',              'STRING',  'رابط شعار النظام. اتركه فارغاً للشعار الافتراضي.',                              'UI',          true, '',               NULL,                                           true, NOW(), NOW()),
    ('FONT_FAMILY',     'Tajawal',       'STRING',  'نوع الخط الأساسي للنظام.',                                                       'UI',          true, 'Tajawal',        'allowed:Tajawal,Cairo,Almarai,Noto Naskh Arabic', true, NOW(), NOW()),
    ('FONT_SIZE_BASE',  '14',            'INTEGER', 'حجم الخط الأساسي بالبكسل.',                                                      'UI',          true, '14',             'min:12,max:18',                                true, NOW(), NOW()),
    ('SYSTEM_NAME_AR',  'نظام واعد الطبي','STRING', 'اسم النظام باللغة العربية — يظهر في العنوان والتقارير.',                         'UI',          true, 'نظام واعد الطبي','maxlength:60',                                 true, NOW(), NOW()),
    ('SYSTEM_NAME_EN',  'TBA WAAD System','STRING', 'System name in English — appears in reports and API responses.',                  'UI',          true, 'TBA WAAD System','maxlength:60',                                 true, NOW(), NOW()),
    -- Member numbering
    ('BENEFICIARY_NUMBER_FORMAT',  'PREFIX_SEQUENCE','STRING',  'صيغة ترقيم المستفيدين: PREFIX_SEQUENCE | YEAR_SEQUENCE | SEQUENTIAL.', 'MEMBERS', true, 'PREFIX_SEQUENCE','allowed:PREFIX_SEQUENCE,YEAR_SEQUENCE,SEQUENTIAL',true, NOW(), NOW()),
    ('BENEFICIARY_NUMBER_PREFIX',  'MEM',           'STRING',  'البادئة في رقم المستفيد (مع PREFIX_SEQUENCE).',                          'MEMBERS', true, 'MEM',            'maxlength:10',                                 true, NOW(), NOW()),
    ('BENEFICIARY_NUMBER_DIGITS',  '6',             'INTEGER', 'عدد أرقام الجزء التسلسلي في رقم المستفيد.',                              'MEMBERS', true, '6',              'min:4,max:10',                                 true, NOW(), NOW()),
    -- Eligibility rules
    ('ELIGIBILITY_STRICT_MODE',       'false', 'BOOLEAN', 'الوضع الصارم: رفض تلقائي لأي طلب خارج نطاق التغطية.',                       'ELIGIBILITY', true, 'false', NULL,            true, NOW(), NOW()),
    ('WAITING_PERIOD_DAYS_DEFAULT',   '30',    'INTEGER', 'فترة الانتظار الافتراضية بالأيام عند إضافة مستفيد لوثيقة.',                 'ELIGIBILITY', true, '30',   'min:0,max:365', true, NOW(), NOW()),
    ('ELIGIBILITY_GRACE_PERIOD_DAYS', '7',     'INTEGER', 'فترة السماح بالأيام بعد انتهاء صلاحية الوثيقة.',                            'ELIGIBILITY', true, '7',    'min:0,max:30',  true, NOW(), NOW())
ON CONFLICT (setting_key) DO NOTHING;

-- ===== END SOURCE: V095__seed_feature_flags.sql =====

