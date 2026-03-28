-- Squashed migration: V11__system_config_feature_flags_module_access.sql
-- System config and feature flags
-- Generated: 2026-03-28T11:35:17


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


-- ===== BEGIN SOURCE: V222__add_service_to_email_request.sql =====

-- Add detected_service_id to pre_auth_email_requests
ALTER TABLE pre_auth_email_requests ADD COLUMN detected_service_id BIGINT;
ALTER TABLE pre_auth_email_requests ADD CONSTRAINT fk_email_detected_service FOREIGN KEY (detected_service_id) REFERENCES medical_services(id);

-- ===== END SOURCE: V222__add_service_to_email_request.sql =====


-- ===== BEGIN SOURCE: V223__link_preauth_to_email_request.sql =====

-- Add email_request_id to pre_authorizations
ALTER TABLE pre_authorizations ADD COLUMN email_request_id BIGINT;
ALTER TABLE pre_authorizations ADD CONSTRAINT fk_preauth_email_request FOREIGN KEY (email_request_id) REFERENCES pre_auth_email_requests(id);

-- ===== END SOURCE: V223__link_preauth_to_email_request.sql =====


-- ===== BEGIN SOURCE: V224__add_email_filtering_settings.sql =====

-- Add filtering columns to email_settings table
ALTER TABLE email_settings ADD COLUMN subject_filter VARCHAR(255);
ALTER TABLE email_settings ADD COLUMN only_from_providers BOOLEAN DEFAULT FALSE;

-- ===== END SOURCE: V224__add_email_filtering_settings.sql =====


-- ===== BEGIN SOURCE: V225__add_sender_name_to_email_requests.sql =====

-- Add sender_name to pre_auth_email_requests
ALTER TABLE pre_auth_email_requests ADD COLUMN sender_name VARCHAR(255);

-- ===== END SOURCE: V225__add_sender_name_to_email_requests.sql =====


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

