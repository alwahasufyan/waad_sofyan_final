-- Squashed migration: V5__provider_contracts_and_pricing.sql
-- Provider contracts and pricing
-- Generated: 2026-03-28T11:35:15


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


-- ===== BEGIN SOURCE: V248__map_pricing_items_categories.sql =====

-- =================================================================================
-- V43: Map Unmapped Pricing Items to Medical Categories
-- Description: Unifies text-based category names into foreign key relations to 
-- avoid performance impact from runtime fuzzy matching.
-- =================================================================================

-- 1. Exact Name Matching
UPDATE provider_contract_pricing_items p
SET medical_category_id = c.id
FROM medical_categories c
WHERE p.medical_category_id IS NULL 
  AND p.category_name IS NOT NULL
  AND TRIM(p.category_name) = c.name;

-- 2. Fuzzy Match: Strip parenthetical suffixes (e.g., " (IP)" or " (OP)") and re-match
UPDATE provider_contract_pricing_items p
SET medical_category_id = c.id
FROM medical_categories c
WHERE p.medical_category_id IS NULL 
  AND p.category_name IS NOT NULL
  AND TRIM(REGEXP_REPLACE(p.category_name, '\s*\(.*?\)\s*$', '')) = c.name;


-- ===== END SOURCE: V248__map_pricing_items_categories.sql =====

