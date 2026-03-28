-- Auto-generated consolidated migration copy (deduplicated)
-- Group: V20260324.104__members_and_imports.sql



-- ===== BEGIN SOURCE: V050__schema_members.sql =====

-- ============================================================
-- V050: Members (insured individuals) and related tables
-- ============================================================
-- Depends on: V005 (employers), V040 (benefit_policies)

-- ----------------------------------------------------------
-- SECTION 1: Members / insured persons
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
    id              BIGINT PRIMARY KEY DEFAULT nextval('member_seq'),
    member_card_id  VARCHAR(100) NOT NULL UNIQUE,
    full_name       VARCHAR(255) NOT NULL,
    full_name_ar    VARCHAR(255),
    date_of_birth   DATE NOT NULL,
    gender          VARCHAR(20) CHECK (gender IN ('MALE','FEMALE')),
    national_id     VARCHAR(50),

    -- Employer relationship
    employer_id     BIGINT,
    employee_id     VARCHAR(100),
    employee_number VARCHAR(100),
    membership_type VARCHAR(50) CHECK (membership_type IN ('PRIMARY','DEPENDENT')),
    relation_to_employee VARCHAR(50),
    relationship    VARCHAR(50),
    parent_id       BIGINT,        -- For dependents: points to primary member

    -- Coverage details
    email               VARCHAR(255),
    phone               VARCHAR(50),
    address             TEXT,
    coverage_start_date DATE,
    coverage_end_date   DATE,
    policy_number       VARCHAR(100),
    start_date          DATE,
    end_date            DATE,
    join_date           DATE,

    -- Benefit policy link
    benefit_policy_id BIGINT,

    -- Card details
    barcode         VARCHAR(100),
    birth_date      DATE,
    card_number     VARCHAR(50),
    card_status     VARCHAR(30),
    card_activated_at TIMESTAMP,
    is_smart_card   BOOLEAN DEFAULT false,
    civil_id        VARCHAR(50),
    national_number VARCHAR(50),

    -- Profile extras
    photo_url           VARCHAR(500),
    profile_photo_path  VARCHAR(500),
    marital_status      VARCHAR(20),
    nationality         VARCHAR(100),
    occupation          VARCHAR(100),
    notes               TEXT,
    emergency_notes     TEXT,

    -- Flags
    is_vip      BOOLEAN DEFAULT false,
    is_urgent   BOOLEAN DEFAULT false,
    blocked_reason VARCHAR(500),

    -- Status and eligibility
    status              VARCHAR(30) DEFAULT 'ACTIVE',
    eligibility_status  VARCHAR(30),
    eligibility_updated_at TIMESTAMP,

    -- Optimistic locking
    version BIGINT DEFAULT 0,

    -- Audit
    active      BOOLEAN DEFAULT true,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255),

    CONSTRAINT fk_member_employer       FOREIGN KEY (employer_id)       REFERENCES employers(id)        ON DELETE RESTRICT,
    CONSTRAINT fk_member_policy         FOREIGN KEY (benefit_policy_id) REFERENCES benefit_policies(id) ON DELETE SET NULL,
    CONSTRAINT fk_member_parent         FOREIGN KEY (parent_id)         REFERENCES members(id)          ON DELETE SET NULL,
    CONSTRAINT chk_coverage_dates       CHECK (coverage_end_date IS NULL OR coverage_end_date >= coverage_start_date)
);

CREATE INDEX IF NOT EXISTS idx_members_card_id         ON members(member_card_id);
CREATE INDEX IF NOT EXISTS idx_members_employer        ON members(employer_id);
CREATE INDEX IF NOT EXISTS idx_members_national_id     ON members(national_id);
CREATE INDEX IF NOT EXISTS idx_members_active          ON members(active);
CREATE INDEX IF NOT EXISTS idx_members_status          ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_parent_id       ON members(parent_id);
CREATE INDEX IF NOT EXISTS idx_members_barcode         ON members(barcode);
CREATE INDEX IF NOT EXISTS idx_members_card_number     ON members(card_number);
CREATE INDEX IF NOT EXISTS idx_members_civil_id        ON members(civil_id);
CREATE INDEX IF NOT EXISTS idx_members_benefit_policy  ON members(benefit_policy_id);
CREATE INDEX IF NOT EXISTS idx_members_employer_active ON members(employer_id, active)
    WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_members_employer_search ON members(employer_id, civil_id, full_name)
    WHERE active = true;

-- ----------------------------------------------------------
-- SECTION 2: Member additional attributes (EAV extension)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_attributes (
    id               BIGSERIAL PRIMARY KEY,
    member_id        BIGINT NOT NULL,
    attribute_code   VARCHAR(100) NOT NULL,
    attribute_value  TEXT,
    source           VARCHAR(50),
    source_reference VARCHAR(200),
    created_by       VARCHAR(100),
    updated_by       VARCHAR(100),
    created_at       TIMESTAMP,
    updated_at       TIMESTAMP,

    CONSTRAINT fk_member_attrs_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT uk_member_attribute_code UNIQUE (member_id, attribute_code)
);

CREATE INDEX IF NOT EXISTS idx_member_attributes_member ON member_attributes(member_id);
CREATE INDEX IF NOT EXISTS idx_member_attributes_code   ON member_attributes(attribute_code);

-- ----------------------------------------------------------
-- SECTION 3: Member annual deductible tracking
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_deductibles (
    id                  BIGSERIAL PRIMARY KEY,
    member_id           BIGINT  NOT NULL,
    deductible_year     INTEGER NOT NULL,
    total_deductible    NUMERIC(10,2) DEFAULT 0.00,
    deductible_used     NUMERIC(10,2) DEFAULT 0.00,
    deductible_remaining NUMERIC(10,2) DEFAULT 0.00,
    version             BIGINT DEFAULT 0,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by          VARCHAR(255),

    CONSTRAINT fk_deductible_member           FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    CONSTRAINT uq_member_deductible_year      UNIQUE (member_id, deductible_year),
    CONSTRAINT chk_deductible_math            CHECK (deductible_remaining = total_deductible - deductible_used),
    CONSTRAINT chk_deductible_non_negative    CHECK (deductible_used >= 0 AND deductible_remaining >= 0)
);

CREATE INDEX IF NOT EXISTS idx_deductibles_member     ON member_deductibles(member_id);
CREATE INDEX IF NOT EXISTS idx_deductibles_year       ON member_deductibles(deductible_year);
CREATE INDEX IF NOT EXISTS idx_deductibles_near_limit ON member_deductibles(member_id, deductible_year)
    WHERE deductible_used >= total_deductible * 0.8;

-- ----------------------------------------------------------
-- SECTION 4: Member ↔ policy enrollment assignments
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_policy_assignments (
    id                    BIGSERIAL PRIMARY KEY,
    member_id             BIGINT NOT NULL,
    policy_id             BIGINT NOT NULL,
    assignment_start_date DATE NOT NULL,
    assignment_end_date   DATE,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by            VARCHAR(255),

    CONSTRAINT fk_assignment_member FOREIGN KEY (member_id)  REFERENCES members(id)         ON DELETE RESTRICT,
    CONSTRAINT fk_assignment_policy FOREIGN KEY (policy_id)  REFERENCES benefit_policies(id) ON DELETE RESTRICT,
    CONSTRAINT chk_assignment_dates CHECK (assignment_end_date IS NULL OR assignment_end_date >= assignment_start_date)
);

CREATE INDEX IF NOT EXISTS idx_policy_assignments_member ON member_policy_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_policy_assignments_policy ON member_policy_assignments(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_assignments_dates  ON member_policy_assignments(assignment_start_date, assignment_end_date);

-- ===== END SOURCE: V050__schema_members.sql =====



-- ===== BEGIN SOURCE: V051__schema_member_import.sql =====

-- ============================================================
-- V051: Member bulk import logs and error records
-- ============================================================
-- Depends on: V050 (members) — member_import_errors FKs to import_logs

-- ----------------------------------------------------------
-- SECTION 1: Member import batch log
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_import_logs (
    id                      BIGSERIAL PRIMARY KEY,
    import_batch_id         VARCHAR(64) NOT NULL UNIQUE,
    file_name               VARCHAR(500),
    file_size_bytes         BIGINT,

    -- Statistics
    total_rows      INTEGER DEFAULT 0,
    created_count   INTEGER DEFAULT 0,
    updated_count   INTEGER DEFAULT 0,
    skipped_count   INTEGER DEFAULT 0,
    error_count     INTEGER DEFAULT 0,

    -- Status
    status          VARCHAR(30) DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','VALIDATING','PROCESSING','COMPLETED','PARTIAL','FAILED')),
    error_message   TEXT,

    -- Timestamps
    started_at          TIMESTAMP,
    completed_at        TIMESTAMP,
    processing_time_ms  BIGINT,

    -- Security context
    imported_by_user_id  BIGINT,
    imported_by_username VARCHAR(100),
    company_scope_id     BIGINT,
    ip_address           VARCHAR(45),
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_member_import_logs_batch   ON member_import_logs(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_member_import_logs_status  ON member_import_logs(status);
CREATE INDEX IF NOT EXISTS idx_member_import_logs_user    ON member_import_logs(imported_by_user_id)
    WHERE imported_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_member_import_logs_created ON member_import_logs(created_at DESC);

-- ----------------------------------------------------------
-- SECTION 2: Per-row import error records
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_import_errors (
    id              BIGSERIAL PRIMARY KEY,
    import_log_id   BIGINT NOT NULL,
    row_number      INTEGER NOT NULL,
    row_data        JSONB,
    error_type      VARCHAR(50),
    error_field     VARCHAR(100),
    error_message   TEXT,
    created_at      TIMESTAMP,

    CONSTRAINT fk_import_errors_log FOREIGN KEY (import_log_id)
        REFERENCES member_import_logs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_import_errors_log_id     ON member_import_errors(import_log_id);
CREATE INDEX IF NOT EXISTS idx_import_errors_row_number ON member_import_errors(row_number);
CREATE INDEX IF NOT EXISTS idx_import_errors_error_type ON member_import_errors(error_type);

-- ===== END SOURCE: V051__schema_member_import.sql =====



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

