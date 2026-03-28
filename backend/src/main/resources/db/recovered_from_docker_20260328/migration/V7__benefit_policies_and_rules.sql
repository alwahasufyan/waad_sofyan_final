-- V7__benefit_policies_and_rules.sql
-- Extracted from V1 baseline during full split.

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
