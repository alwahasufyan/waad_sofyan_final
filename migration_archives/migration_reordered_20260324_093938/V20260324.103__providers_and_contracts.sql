-- Auto-generated consolidated migration copy
-- Source snapshot: D:\waad_sofyan_final\backend\src\main\resources\db\migration_archive_20260324_093938
-- Group: V20260324.103__providers_and_contracts.sql



-- ===== BEGIN SOURCE: V006__schema_providers.sql =====

-- ============================================================
-- V006: Providers, allowed employers, admin documents
-- ============================================================
-- Depends on: V005 (employers)

-- ----------------------------------------------------------
-- SECTION 1: Healthcare providers
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS providers (
    id                      BIGINT PRIMARY KEY DEFAULT nextval('provider_seq'),
    provider_name           VARCHAR(255) NOT NULL,
    provider_name_ar        VARCHAR(255),
    license_number          VARCHAR(100) NOT NULL UNIQUE,
    provider_type           VARCHAR(50)  NOT NULL
        CHECK (provider_type IN ('HOSPITAL','CLINIC','PHARMACY','LAB','RADIOLOGY','OTHER')),

    -- Contact
    contact_person          VARCHAR(255),
    contact_email           VARCHAR(255) UNIQUE,
    contact_phone           VARCHAR(50),
    address                 TEXT,
    city                    VARCHAR(100),
    region                  VARCHAR(100),

    -- Banking (for settlement)
    bank_name               VARCHAR(255),
    bank_account_number     VARCHAR(100),
    iban                    VARCHAR(50),

    -- Extended contact (runtime columns)
    allow_all_employers     BOOLEAN DEFAULT false,
    tax_company_code        VARCHAR(50),
    principal_name          VARCHAR(255),
    principal_phone         VARCHAR(50),
    principal_email         VARCHAR(255),
    principal_mobile        VARCHAR(50),
    principal_address       TEXT,
    secondary_contact       VARCHAR(255),
    secondary_contact_phone VARCHAR(50),
    secondary_contact_email VARCHAR(255),
    accounting_person       VARCHAR(255),
    accounting_phone        VARCHAR(50),
    accounting_email        VARCHAR(255),
    provider_status         VARCHAR(50),

    -- Audit
    active      BOOLEAN DEFAULT true,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_providers_type    ON providers(provider_type) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_providers_active  ON providers(active);
CREATE INDEX IF NOT EXISTS idx_providers_license ON providers(license_number);

-- ----------------------------------------------------------
-- SECTION 2: Provider–employer allow list (access control)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_allowed_employers (
    id          BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    employer_id BIGINT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by  VARCHAR(255),

    CONSTRAINT fk_allowed_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    CONSTRAINT fk_allowed_employer FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE CASCADE,
    CONSTRAINT uq_provider_employer UNIQUE (provider_id, employer_id)
);

CREATE INDEX IF NOT EXISTS idx_allowed_employers_provider ON provider_allowed_employers(provider_id);
CREATE INDEX IF NOT EXISTS idx_allowed_employers_employer ON provider_allowed_employers(employer_id);

-- ----------------------------------------------------------
-- SECTION 3: Provider administrative documents
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_admin_documents (
    id            BIGSERIAL PRIMARY KEY,
    provider_id   BIGINT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    file_path     VARCHAR(500) NOT NULL,
    file_size     BIGINT,
    uploaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by   VARCHAR(255),

    CONSTRAINT fk_provider_docs FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_provider_docs_provider ON provider_admin_documents(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_docs_type     ON provider_admin_documents(document_type);

-- ===== END SOURCE: V006__schema_providers.sql =====



-- ===== BEGIN SOURCE: V030__schema_provider_services.sql =====

-- ============================================================
-- V030: Provider services directory and medical reviewer assignments
-- ============================================================
-- Depends on: V006 (providers), V010 (users)

-- ----------------------------------------------------------
-- SECTION 1: Provider active service directory
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_services (
    id          BIGSERIAL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    service_code VARCHAR(50) NOT NULL,
    active       BOOLEAN DEFAULT true,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_provider_services_provider FOREIGN KEY (provider_id)
        REFERENCES providers(id) ON DELETE CASCADE,
    CONSTRAINT unique_provider_service UNIQUE (provider_id, service_code)
);

CREATE INDEX IF NOT EXISTS idx_provider_services_provider ON provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_code     ON provider_services(service_code);
CREATE INDEX IF NOT EXISTS idx_provider_services_active   ON provider_services(active);

-- ----------------------------------------------------------
-- SECTION 2: Medical reviewer ↔ provider assignments
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS medical_reviewer_providers (
    id          BIGSERIAL PRIMARY KEY,
    reviewer_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  VARCHAR(255),
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by  VARCHAR(255),

    CONSTRAINT fk_mrp_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id)     ON DELETE RESTRICT,
    CONSTRAINT fk_mrp_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    CONSTRAINT uk_reviewer_provider UNIQUE (reviewer_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_mrp_reviewer_id ON medical_reviewer_providers(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_mrp_provider_id ON medical_reviewer_providers(provider_id);
CREATE INDEX IF NOT EXISTS idx_mrp_active       ON medical_reviewer_providers(active);

-- ----------------------------------------------------------
-- SECTION 3: Provider service price import log
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_service_price_import_logs (
    id                  BIGSERIAL PRIMARY KEY,
    import_batch_id     VARCHAR(64) NOT NULL UNIQUE,
    provider_id         BIGINT NOT NULL,
    provider_code       VARCHAR(100) NOT NULL,
    provider_name       VARCHAR(255) NOT NULL,
    file_name           VARCHAR(255) NOT NULL,
    file_size_bytes     BIGINT,
    import_mode         VARCHAR(20) NOT NULL DEFAULT 'REPLACE',
    total_rows          INTEGER DEFAULT 0,
    success_count       INTEGER DEFAULT 0,
    error_count         INTEGER DEFAULT 0,
    skipped_count       INTEGER DEFAULT 0,
    status              VARCHAR(20) DEFAULT 'PENDING',
    error_details       JSONB,
    started_at          TIMESTAMP,
    completed_at        TIMESTAMP,
    processing_time_ms  BIGINT,
    imported_by_user_id BIGINT,
    imported_by_username VARCHAR(100),
    created_at          TIMESTAMP
);

-- ===== END SOURCE: V030__schema_provider_services.sql =====



-- ===== BEGIN SOURCE: V031__schema_provider_mapping.sql =====

-- ============================================================
-- V031: Provider service mapping center
-- ============================================================
-- Allows mapping raw provider service names → canonical medical_services.
-- Depends on: V006 (providers), V010 (users), V021 (medical_services)

-- ----------------------------------------------------------
-- SECTION 1: Raw provider service names (as submitted by provider)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_raw_services (
    id              BIGSERIAL PRIMARY KEY,
    provider_id     BIGINT NOT NULL,
    raw_name        VARCHAR(500) NOT NULL,
    normalized_name VARCHAR(500),
    code            VARCHAR(100),
    encounter_type  VARCHAR(20),
    source          VARCHAR(50),
    import_batch_id BIGINT,
    status          VARCHAR(30) DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','AUTO_MATCHED','MANUAL_CONFIRMED','REJECTED')),
    confidence_score NUMERIC(5,2),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_prs_provider      FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    CONSTRAINT uq_prs_provider_name UNIQUE (provider_id, raw_name)
);

CREATE INDEX IF NOT EXISTS idx_prs_provider ON provider_raw_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_prs_status   ON provider_raw_services(status);

-- ----------------------------------------------------------
-- SECTION 2: Confirmed service mappings (raw → canonical)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_service_mappings (
    id                      BIGSERIAL PRIMARY KEY,
    provider_raw_service_id BIGINT NOT NULL,
    medical_service_id      BIGINT NOT NULL,
    mapping_status          VARCHAR(30) NOT NULL,
    mapped_by               BIGINT,
    mapped_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confidence_score        NUMERIC(5,2),

    CONSTRAINT fk_psm_raw     FOREIGN KEY (provider_raw_service_id) REFERENCES provider_raw_services(id) ON DELETE CASCADE,
    CONSTRAINT fk_psm_service FOREIGN KEY (medical_service_id)      REFERENCES medical_services(id)       ON DELETE RESTRICT,
    CONSTRAINT fk_psm_user    FOREIGN KEY (mapped_by)               REFERENCES users(id),
    CONSTRAINT uq_psm_raw_service UNIQUE (provider_raw_service_id)
);

CREATE INDEX IF NOT EXISTS idx_psm_medical_service ON provider_service_mappings(medical_service_id);

-- ----------------------------------------------------------
-- SECTION 3: Mapping audit trail
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_mapping_audit (
    id                      BIGSERIAL PRIMARY KEY,
    provider_raw_service_id BIGINT,
    action                  VARCHAR(50) NOT NULL,
    old_value               TEXT,
    new_value               TEXT,
    performed_by            BIGINT,
    performed_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pma_raw  FOREIGN KEY (provider_raw_service_id) REFERENCES provider_raw_services(id),
    CONSTRAINT fk_pma_user FOREIGN KEY (performed_by)            REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_pma_raw_service ON provider_mapping_audit(provider_raw_service_id);

-- ===== END SOURCE: V031__schema_provider_mapping.sql =====



-- ===== BEGIN SOURCE: V045__schema_provider_contracts.sql =====

-- ============================================================
-- V045: Provider contracts and pricing
-- ============================================================
-- Depends on: V006 (providers), V005 (employers), V021 (medical_services)

-- ----------------------------------------------------------
-- SECTION 1: Provider contracts
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_contracts (
    id              BIGINT PRIMARY KEY DEFAULT nextval('provider_contract_seq'),
    provider_id     BIGINT NOT NULL,
    employer_id     BIGINT NOT NULL,
    contract_number VARCHAR(100) NOT NULL UNIQUE,

    -- Contract terms
    contract_start_date DATE NOT NULL,
    contract_end_date   DATE,
    discount_percent    NUMERIC(5,2),
    payment_terms       VARCHAR(100),

    -- Business rules
    max_sessions_per_service    INTEGER,
    requires_preauthorization   BOOLEAN DEFAULT false,

    -- Status
    contract_status VARCHAR(50)
        CHECK (contract_status IN ('DRAFT','ACTIVE','EXPIRED','TERMINATED')),
    active  BOOLEAN DEFAULT true,
    status  VARCHAR(20) DEFAULT 'DRAFT',

    -- Audit
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255),

    CONSTRAINT fk_contract_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_contract_employer FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE RESTRICT,
    CONSTRAINT chk_contract_dates   CHECK (contract_end_date IS NULL OR contract_end_date >= contract_start_date)
);

CREATE INDEX IF NOT EXISTS idx_contracts_provider ON provider_contracts(provider_id);
CREATE INDEX IF NOT EXISTS idx_contracts_employer ON provider_contracts(employer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status   ON provider_contracts(contract_status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_contract_per_provider ON provider_contracts(provider_id)
    WHERE contract_status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_provider_contracts_active   ON provider_contracts(active);
CREATE INDEX IF NOT EXISTS idx_provider_contracts_expiring ON provider_contracts(contract_end_date)
    WHERE active = true AND contract_end_date IS NOT NULL;

-- ----------------------------------------------------------
-- SECTION 2: Contract service pricing items
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_contract_pricing_items (
    id                  BIGSERIAL PRIMARY KEY,
    contract_id         BIGINT NOT NULL,
    medical_service_id  BIGINT,
    service_category    VARCHAR(100),
    unit_price          NUMERIC(15,2) NOT NULL,
    effective_from      DATE,
    effective_to        DATE,
    active              BOOLEAN DEFAULT true,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP,
    created_by          VARCHAR(255),

    CONSTRAINT fk_pricing_contract FOREIGN KEY (contract_id)         REFERENCES provider_contracts(id)  ON DELETE CASCADE,
    CONSTRAINT fk_pricing_service  FOREIGN KEY (medical_service_id)  REFERENCES medical_services(id)    ON DELETE RESTRICT
);

-- ----------------------------------------------------------
-- SECTION 3: Provider network tiers
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS network_providers (
    id          BIGSERIAL PRIMARY KEY,
    employer_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    network_tier VARCHAR(50) CHECK (network_tier IN ('TIER_1','TIER_2','TIER_3','OUT_OF_NETWORK')),
    effective_date DATE NOT NULL,
    expiry_date    DATE,
    active         BOOLEAN DEFAULT true,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by     VARCHAR(255),

    CONSTRAINT fk_network_employer FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_network_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_network_provider ON network_providers(employer_id, provider_id) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_network_employer ON network_providers(employer_id);
CREATE INDEX IF NOT EXISTS idx_network_provider ON network_providers(provider_id);
CREATE INDEX IF NOT EXISTS idx_network_tier     ON network_providers(network_tier);

-- ----------------------------------------------------------
-- SECTION 4: Legacy provider contract pricing (backward compat)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS legacy_provider_contracts (
    id              BIGSERIAL PRIMARY KEY,
    provider_id     BIGINT NOT NULL,
    service_code    VARCHAR(50)   NOT NULL,
    contract_price  NUMERIC(10,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'LYD',
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    active          BOOLEAN DEFAULT true,
    notes           VARCHAR(500),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP,
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_legacy_contract_service_date
    ON legacy_provider_contracts(provider_id, service_code, effective_from);
CREATE INDEX IF NOT EXISTS idx_legacy_contracts_provider ON legacy_provider_contracts(provider_id);
CREATE INDEX IF NOT EXISTS idx_legacy_contracts_service  ON legacy_provider_contracts(service_code);
CREATE INDEX IF NOT EXISTS idx_legacy_contracts_active   ON legacy_provider_contracts(active);

-- ===== END SOURCE: V045__schema_provider_contracts.sql =====



-- ===== BEGIN SOURCE: V098__employer_financial_contract_fields.sql =====

-- V098: Add financial, contract, and capacity fields to employers table
-- Addresses:
--   - CR Number (رقم السجل التجاري) for financial reports
--   - Tax Number (الرقم الضريبي) for invoicing
--   - Contact phone / email (if not already present)
--   - Contract start/end dates
--   - Max member limit

-- Commercial Registration Number
ALTER TABLE employers
    ADD COLUMN IF NOT EXISTS cr_number VARCHAR(50);

-- Tax / VAT Number
ALTER TABLE employers
    ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50);

-- Contract period with this employer
ALTER TABLE employers
    ADD COLUMN IF NOT EXISTS contract_start_date DATE;

ALTER TABLE employers
    ADD COLUMN IF NOT EXISTS contract_end_date DATE;

-- Maximum members allowed (NULL = unlimited)
ALTER TABLE employers
    ADD COLUMN IF NOT EXISTS max_member_limit INTEGER;

-- Contact fields (guard with IF NOT EXISTS in case they were added manually)
ALTER TABLE employers
    ADD COLUMN IF NOT EXISTS phone VARCHAR(30);

ALTER TABLE employers
    ADD COLUMN IF NOT EXISTS email VARCHAR(150);

ALTER TABLE employers
    ADD COLUMN IF NOT EXISTS address VARCHAR(255);

-- ===== END SOURCE: V098__employer_financial_contract_fields.sql =====



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



-- ===== BEGIN SOURCE: V108__make_specialty_nullable.sql =====

-- ============================================================
-- V108: Make Specialty Nullable in Medical Services
-- ============================================================
-- The user decided not to enforce medical specialty classification 
-- during service creation in the contract pricing context.

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'medical_services'
		  AND column_name = 'specialty_id'
	) THEN
		ALTER TABLE medical_services ALTER COLUMN specialty_id DROP NOT NULL;
	END IF;
END $$;

-- 2. Drop the check constraint if it exists
ALTER TABLE medical_services DROP CONSTRAINT IF EXISTS chk_service_has_specialty;

-- ===== END SOURCE: V108__make_specialty_nullable.sql =====



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



-- ===== BEGIN SOURCE: V234__add_subcategory_and_specialty_to_provider_contract_pricing_items.sql =====

ALTER TABLE provider_contract_pricing_items
    ADD COLUMN IF NOT EXISTS sub_category_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS specialty VARCHAR(255);

-- ===== END SOURCE: V234__add_subcategory_and_specialty_to_provider_contract_pricing_items.sql =====



-- ===== BEGIN SOURCE: V241__add_pricing_item_sub_category_and_specialty.sql =====

-- ============================================================
-- V36: Add sub_category_name and specialty columns to provider_contract_pricing_items
-- Required for enhanced Excel price-list import with category resolution
-- ============================================================

ALTER TABLE provider_contract_pricing_items
    ADD COLUMN IF NOT EXISTS sub_category_name VARCHAR(255);

ALTER TABLE provider_contract_pricing_items
    ADD COLUMN IF NOT EXISTS specialty VARCHAR(255);


-- ===== END SOURCE: V241__add_pricing_item_sub_category_and_specialty.sql =====

