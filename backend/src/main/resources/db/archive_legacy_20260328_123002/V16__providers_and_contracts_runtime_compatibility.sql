-- V16__providers_and_contracts_runtime_compatibility.sql
-- Aligns runtime schema with current JPA mappings for providers and modern provider contracts.

-- ----------------------------------------------------------
-- providers compatibility
-- ----------------------------------------------------------
ALTER TABLE providers
    ADD COLUMN IF NOT EXISTS name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS email VARCHAR(100),
    ADD COLUMN IF NOT EXISTS network_status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS contract_start_date DATE,
    ADD COLUMN IF NOT EXISTS contract_end_date DATE,
    ADD COLUMN IF NOT EXISTS default_discount_rate NUMERIC(5,2);

UPDATE providers
SET
    name = COALESCE(name, provider_name, provider_name_ar, 'Provider-' || id),
    tax_number = COALESCE(tax_number, tax_company_code),
    phone = COALESCE(phone, contact_phone),
    email = COALESCE(email, contact_email),
    network_status = COALESCE(
        network_status,
        CASE UPPER(COALESCE(provider_status, ''))
            WHEN 'OUT_OF_NETWORK' THEN 'OUT_OF_NETWORK'
            WHEN 'PREFERRED' THEN 'PREFERRED'
            ELSE 'IN_NETWORK'
        END
    );

ALTER TABLE providers
    ALTER COLUMN name SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name);
CREATE INDEX IF NOT EXISTS idx_providers_network_status ON providers(network_status);

-- ----------------------------------------------------------
-- provider_contracts compatibility (ModernProviderContract)
-- ----------------------------------------------------------
ALTER TABLE provider_contracts
    ADD COLUMN IF NOT EXISTS contract_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(20),
    ADD COLUMN IF NOT EXISTS discount_rate NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS end_date DATE,
    ADD COLUMN IF NOT EXISTS signed_date DATE,
    ADD COLUMN IF NOT EXISTS total_value NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
    ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN,
    ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100),
    ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS contact_email VARCHAR(100),
    ADD COLUMN IF NOT EXISTS notes VARCHAR(2000);

UPDATE provider_contracts
SET
    contract_code = COALESCE(contract_code, NULLIF(contract_number, ''), 'PC-' || id),
    pricing_model = COALESCE(pricing_model, 'DISCOUNT'),
    start_date = COALESCE(start_date, contract_start_date, CURRENT_DATE),
    end_date = COALESCE(end_date, contract_end_date),
    currency = COALESCE(currency, 'LYD'),
    auto_renew = COALESCE(auto_renew, false);

ALTER TABLE provider_contracts
    ALTER COLUMN contract_code SET NOT NULL,
    ALTER COLUMN pricing_model SET NOT NULL,
    ALTER COLUMN start_date SET NOT NULL,
    ALTER COLUMN auto_renew SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_contracts_contract_code ON provider_contracts(contract_code);
CREATE INDEX IF NOT EXISTS idx_provider_contracts_start_date_new ON provider_contracts(start_date);
CREATE INDEX IF NOT EXISTS idx_provider_contracts_end_date_new ON provider_contracts(end_date);

-- ----------------------------------------------------------
-- provider_contract_pricing_items compatibility
-- ----------------------------------------------------------
ALTER TABLE provider_contract_pricing_items
    ADD COLUMN IF NOT EXISTS medical_category_id BIGINT,
    ADD COLUMN IF NOT EXISTS service_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS service_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS category_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS sub_category_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS specialty VARCHAR(255),
    ADD COLUMN IF NOT EXISTS quantity INTEGER,
    ADD COLUMN IF NOT EXISTS base_price NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS contract_price NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS unit VARCHAR(50),
    ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
    ADD COLUMN IF NOT EXISTS notes VARCHAR(2000),
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

UPDATE provider_contract_pricing_items
SET
    category_name = COALESCE(category_name, service_category),
    quantity = COALESCE(quantity, 0),
    base_price = COALESCE(base_price, unit_price, 0),
    contract_price = COALESCE(contract_price, unit_price, 0),
    discount_percent = COALESCE(discount_percent, 0),
    unit = COALESCE(unit, 'service'),
    currency = COALESCE(currency, 'LYD');

ALTER TABLE provider_contract_pricing_items
    ALTER COLUMN quantity SET DEFAULT 0,
    ALTER COLUMN discount_percent SET DEFAULT 0,
    ALTER COLUMN unit SET DEFAULT 'service',
    ALTER COLUMN currency SET DEFAULT 'LYD';

ALTER TABLE provider_contract_pricing_items
    ADD CONSTRAINT fk_pricing_category
    FOREIGN KEY (medical_category_id) REFERENCES medical_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pricing_category_id ON provider_contract_pricing_items(medical_category_id);
CREATE INDEX IF NOT EXISTS idx_pricing_service_name ON provider_contract_pricing_items(service_name);
