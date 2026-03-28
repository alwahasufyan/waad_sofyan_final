-- Squashed migration: V6__benefit_policies_and_rules.sql
-- Benefit policies and policy rules
-- Generated: 2026-03-28T11:35:15


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


-- ===== BEGIN SOURCE: V245__add_coverage_percent_db_constraint.sql =====

-- V40: Add DB-level CHECK constraint for coverage_percent in benefit_policy_rules
-- JPA @Min(0)/@Max(100) annotations enforce this at the application layer,
-- but without a DB constraint a direct INSERT/UPDATE could bypass it.
-- NULL is allowed (means "use policy default").
ALTER TABLE benefit_policy_rules
    ADD CONSTRAINT chk_bpr_coverage_percent
    CHECK (coverage_percent IS NULL OR (coverage_percent >= 0 AND coverage_percent <= 100));

-- ===== END SOURCE: V245__add_coverage_percent_db_constraint.sql =====

