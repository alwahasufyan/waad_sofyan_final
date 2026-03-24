-- Auto-generated consolidated migration copy
-- Unmatched source files



-- ===== BEGIN SOURCE: V040__schema_benefit_policies.sql =====

-- ============================================================
-- V040: Benefit policies and coverage rules
-- ============================================================
-- Depends on: V005 (employers), V021 (medical_services)

-- ----------------------------------------------------------
-- SECTION 1: Benefit policies (insurance plans)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS benefit_policies (
    id          BIGINT PRIMARY KEY DEFAULT nextval('benefit_policy_seq'),
    policy_name VARCHAR(255) NOT NULL,
    policy_code VARCHAR(50)  NOT NULL UNIQUE,
    employer_id BIGINT NOT NULL,

    -- Runtime alias columns
    name        VARCHAR(255),

    -- Coverage financial limits
    annual_limit         NUMERIC(12,2),
    per_visit_limit      NUMERIC(10,2),
    deductible_amount    NUMERIC(10,2),
    copay_percentage     NUMERIC(5,2),
    annual_deductible    DECIMAL(15,2) DEFAULT 0.00,
    out_of_pocket_max    DECIMAL(15,2) DEFAULT 0.00,

    -- Per-member / per-family limits
    per_member_limit     NUMERIC(15,2),
    per_family_limit     NUMERIC(15,2),

    -- Policy metadata
    policy_type VARCHAR(50) CHECK (policy_type IN ('BASIC','PREMIUM','EXECUTIVE','CUSTOM')),
    description TEXT,
    notes       VARCHAR(1000),

    -- Status and dates
    status          VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE')),
    start_date      DATE,
    end_date        DATE,
    effective_date  DATE NOT NULL,
    expiry_date     DATE,

    -- Coverage defaults
    default_coverage_percent     INTEGER DEFAULT 80,
    default_waiting_period_days  INTEGER DEFAULT 0,
    covered_members_count        INTEGER DEFAULT 0,

    -- Audit
    active      BOOLEAN DEFAULT true,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255),

    CONSTRAINT fk_policy_employer FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE RESTRICT,
    CONSTRAINT chk_policy_dates CHECK (expiry_date IS NULL OR expiry_date >= effective_date)
);

CREATE INDEX IF NOT EXISTS idx_policies_code       ON benefit_policies(policy_code);
CREATE INDEX IF NOT EXISTS idx_policies_employer   ON benefit_policies(employer_id);
CREATE INDEX IF NOT EXISTS idx_policies_type       ON benefit_policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_policies_active     ON benefit_policies(active);
CREATE INDEX IF NOT EXISTS idx_policies_start_date ON benefit_policies(start_date);
CREATE INDEX IF NOT EXISTS idx_policies_end_date   ON benefit_policies(end_date);

-- ----------------------------------------------------------
-- SECTION 2: Benefit policy rules (per-service coverage details)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS benefit_policy_rules (
    id          BIGSERIAL PRIMARY KEY,
    policy_id   BIGINT NOT NULL,

    -- Service targeting
    service_category        VARCHAR(100),
    medical_category_id     BIGINT,
    medical_service_id      BIGINT,

    -- Coverage rules
    coverage_percentage         NUMERIC(5,2),
    coverage_percent            INTEGER,            -- runtime alias
    max_sessions_per_year       INTEGER,
    times_limit                 INTEGER,            -- runtime alias
    requires_preauth            BOOLEAN DEFAULT false,
    requires_pre_approval       BOOLEAN DEFAULT false,  -- runtime alias
    waiting_period_days         INTEGER,

    -- Limits
    max_amount_per_session  NUMERIC(10,2),
    max_amount_per_year     NUMERIC(12,2),
    amount_limit            NUMERIC(15,2),          -- runtime alias

    notes       VARCHAR(500),
    active      BOOLEAN DEFAULT true,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP,
    created_by  VARCHAR(255),

    CONSTRAINT fk_rule_policy  FOREIGN KEY (policy_id)          REFERENCES benefit_policies(id)  ON DELETE CASCADE,
    CONSTRAINT fk_rule_service FOREIGN KEY (medical_service_id) REFERENCES medical_services(id)  ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_bpr_policy   ON benefit_policy_rules(policy_id);
CREATE INDEX IF NOT EXISTS idx_bpr_category ON benefit_policy_rules(medical_category_id);
CREATE INDEX IF NOT EXISTS idx_bpr_service  ON benefit_policy_rules(medical_service_id);
CREATE INDEX IF NOT EXISTS idx_bpr_active   ON benefit_policy_rules(active);

-- ===== END SOURCE: V040__schema_benefit_policies.sql =====



-- ===== BEGIN SOURCE: V061__schema_eligibility_checks.sql =====

-- ============================================================
-- V061: Eligibility checks (verification audit trail)
-- ============================================================
-- Depends on: V050 (members), V040 (benefit_policies)

CREATE TABLE IF NOT EXISTS eligibility_checks (
    id          BIGSERIAL PRIMARY KEY,
    member_id   BIGINT NOT NULL,

    -- Legacy columns (V4)
    check_date      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_eligible     BOOLEAN NOT NULL,
    eligibility_reason TEXT,
    policy_id       BIGINT,
    coverage_status VARCHAR(50),
    visit_id        BIGINT,
    checked_by      VARCHAR(255),

    -- Runtime columns (V24 — unique request_id pattern)
    request_id          VARCHAR(36) NOT NULL UNIQUE,
    check_timestamp     TIMESTAMP   NOT NULL,
    provider_id         BIGINT,
    service_date        DATE NOT NULL,
    service_code        VARCHAR(50),
    eligible            BOOLEAN NOT NULL,
    status              VARCHAR(50) NOT NULL,
    reasons             TEXT,
    member_name         VARCHAR(255),
    member_civil_id     VARCHAR(50),
    member_status       VARCHAR(30),
    policy_number       VARCHAR(100),
    policy_status       VARCHAR(30),
    policy_start_date   DATE,
    policy_end_date     DATE,
    employer_id         BIGINT,
    employer_name       VARCHAR(255),
    checked_by_user_id  BIGINT,
    checked_by_username VARCHAR(100),
    company_scope_id    BIGINT,
    ip_address          VARCHAR(45),
    user_agent          VARCHAR(500),
    processing_time_ms  INTEGER,
    rules_evaluated     INTEGER,
    created_at          TIMESTAMP NOT NULL,

    CONSTRAINT fk_eligibility_member FOREIGN KEY (member_id)  REFERENCES members(id)         ON DELETE RESTRICT,
    CONSTRAINT fk_eligibility_policy FOREIGN KEY (policy_id)  REFERENCES benefit_policies(id) ON DELETE RESTRICT,
    CONSTRAINT uk_eligibility_request_id UNIQUE (request_id)
);

CREATE INDEX IF NOT EXISTS idx_eligibility_member        ON eligibility_checks(member_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_date          ON eligibility_checks(check_date DESC);
CREATE INDEX IF NOT EXISTS idx_eligibility_status        ON eligibility_checks(status);
CREATE INDEX IF NOT EXISTS idx_eligibility_request_id    ON eligibility_checks(request_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_policy_id     ON eligibility_checks(policy_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_member_date   ON eligibility_checks(member_id, check_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_eligibility_service_date  ON eligibility_checks(service_date DESC);
CREATE INDEX IF NOT EXISTS idx_eligibility_scope         ON eligibility_checks(company_scope_id);

-- ===== END SOURCE: V061__schema_eligibility_checks.sql =====



-- ===== BEGIN SOURCE: V103__rename_policy_id_to_benefit_policy_id.sql =====

-- V103: Ensure benefit_policy_id exists in benefit_policy_rules
-- Renames policy_id -> benefit_policy_id only if benefit_policy_id does not yet exist

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'benefit_policy_rules' AND column_name = 'benefit_policy_id'
    ) THEN
        ALTER TABLE benefit_policy_rules RENAME COLUMN policy_id TO benefit_policy_id;
    END IF;
END $$;

-- ===== END SOURCE: V103__rename_policy_id_to_benefit_policy_id.sql =====



-- ===== BEGIN SOURCE: V244__add_manual_refused_amount.sql =====

ALTER TABLE claim_lines ADD COLUMN IF NOT EXISTS manual_refused_amount DECIMAL(15,2) DEFAULT 0.00;

-- ===== END SOURCE: V244__add_manual_refused_amount.sql =====



-- ===== BEGIN SOURCE: V245__add_coverage_percent_db_constraint.sql =====

-- V40: Add DB-level CHECK constraint for coverage_percent in benefit_policy_rules
-- JPA @Min(0)/@Max(100) annotations enforce this at the application layer,
-- but without a DB constraint a direct INSERT/UPDATE could bypass it.
-- NULL is allowed (means "use policy default").
ALTER TABLE benefit_policy_rules
    ADD CONSTRAINT chk_bpr_coverage_percent
    CHECK (coverage_percent IS NULL OR (coverage_percent >= 0 AND coverage_percent <= 100));

-- ===== END SOURCE: V245__add_coverage_percent_db_constraint.sql =====

