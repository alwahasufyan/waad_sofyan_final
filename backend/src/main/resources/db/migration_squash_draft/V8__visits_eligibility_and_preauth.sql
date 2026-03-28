-- Squashed migration: V8__visits_eligibility_and_preauth.sql
-- Visits, eligibility and pre-authorization
-- Generated: 2026-03-28T11:35:15


-- ===== BEGIN SOURCE: V060__schema_visits.sql =====

-- ============================================================
-- V060: Patient visits and attachments
-- ============================================================
-- Depends on: V050 (members), V005 (employers), V006 (providers),
--             V020 (medical_categories), V021 (medical_services)

-- ----------------------------------------------------------
-- SECTION 1: Visits (central patient encounter record)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS visits (
    id          BIGSERIAL PRIMARY KEY,
    member_id   BIGINT NOT NULL,
    employer_id BIGINT,
    provider_id BIGINT,

    -- Medical category / service
    medical_category_id   BIGINT,
    medical_category_name VARCHAR(200),
    medical_service_id    BIGINT,
    medical_service_code  VARCHAR(50),
    medical_service_name  VARCHAR(200),

    -- Visit details
    doctor_name      VARCHAR(255),
    specialty        VARCHAR(100),
    visit_date       DATE NOT NULL,
    diagnosis        TEXT,
    treatment        TEXT,
    total_amount     NUMERIC(10,2),
    notes            TEXT,

    -- Visit type and status
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

    -- Eligibility check that produced this visit
    eligibility_check_id BIGINT,

    -- Optimistic locking
    version BIGINT DEFAULT 0,

    -- Audit
    active      BOOLEAN DEFAULT true,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_visit_member   FOREIGN KEY (member_id)   REFERENCES members(id)   ON DELETE RESTRICT,
    CONSTRAINT fk_visit_employer FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE RESTRICT,
    CONSTRAINT chk_visit_date_reasonable CHECK (
        visit_date <= CURRENT_DATE AND visit_date >= CURRENT_DATE - INTERVAL '10 years'
    )
);

CREATE INDEX IF NOT EXISTS idx_visits_member      ON visits(member_id);
CREATE INDEX IF NOT EXISTS idx_visits_employer    ON visits(employer_id);
CREATE INDEX IF NOT EXISTS idx_visits_provider    ON visits(provider_id);
CREATE INDEX IF NOT EXISTS idx_visits_date        ON visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_status      ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_member_date ON visits(member_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_provider_date ON visits(provider_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_category    ON visits(medical_category_id) WHERE medical_category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visits_service     ON visits(medical_service_id)  WHERE medical_service_id  IS NOT NULL;

-- ----------------------------------------------------------
-- SECTION 2: Visit supporting documents
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS visit_attachments (
    id                  BIGSERIAL PRIMARY KEY,
    visit_id            BIGINT NOT NULL,
    file_name           VARCHAR(500) NOT NULL,
    original_file_name  VARCHAR(500),
    file_key            VARCHAR(500),
    file_type           VARCHAR(100),
    file_size           BIGINT,
    attachment_type     VARCHAR(50)
        CHECK (attachment_type IN ('XRAY','MRI','CT_SCAN','LAB_RESULT','PRESCRIPTION','MEDICAL_REPORT','OTHER')),
    description         TEXT,
    uploaded_by         VARCHAR(100),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_visit_attachment FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_visit_attachments_visit      ON visit_attachments(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_attachments_type       ON visit_attachments(attachment_type);
CREATE INDEX IF NOT EXISTS idx_visit_attachments_visit_date ON visit_attachments(visit_id, created_at DESC);

-- ===== END SOURCE: V060__schema_visits.sql =====


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


-- ===== BEGIN SOURCE: V065__schema_pre_authorization.sql =====

-- ============================================================
-- V065: Pre-authorizations
-- ============================================================
-- Depends on: V006 (providers), V050 (members),
--             V021 (medical_services), V060 (visits)

-- ----------------------------------------------------------
-- SECTION 1: Pre-authorization requests (original model)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS preauthorization_requests (
    id              BIGSERIAL PRIMARY KEY,
    request_number  VARCHAR(100),
    provider_id     BIGINT NOT NULL,
    member_id       BIGINT NOT NULL,

    -- Service details
    service_date            DATE,
    requested_service_date  DATE,
    diagnosis_code          VARCHAR(50),
    diagnosis_description   TEXT,

    -- Financial
    requested_amount NUMERIC(15,2),
    approved_amount  NUMERIC(15,2),

    -- Status machine
    status VARCHAR(50)
        CHECK (status IN ('PENDING','APPROVED','REJECTED','EXPIRED','CANCELLED')),

    -- Validity window
    valid_from  TIMESTAMP,
    valid_until TIMESTAMP,

    -- Audit
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP,
    approved_at TIMESTAMP,
    created_by  VARCHAR(255),
    approved_by VARCHAR(255),

    CONSTRAINT fk_pauthreq_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pauthreq_member   FOREIGN KEY (member_id)   REFERENCES members(id)   ON DELETE RESTRICT
);

-- Sequences for this table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'preauth_seq') THEN
        CREATE SEQUENCE preauth_seq START WITH 1 INCREMENT BY 50;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pauthreq_member_status_date ON preauthorization_requests(member_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pauthreq_expiring           ON preauthorization_requests(valid_until)
    WHERE status = 'APPROVED' AND valid_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pauthreq_provider_date      ON preauthorization_requests(provider_id, created_at DESC, status);

-- ----------------------------------------------------------
-- SECTION 2: Pre-authorizations (runtime compatibility table)
-- ----------------------------------------------------------
-- This table satisfies JPQL queries that join on pre_authorizations.
-- It mirrors the full shape of the pre-authorization JPA entity.
CREATE TABLE IF NOT EXISTS pre_authorizations (
    id                              BIGSERIAL PRIMARY KEY,
    active                          BOOLEAN DEFAULT true,
    approved_amount                 NUMERIC(15,2),
    approved_at                     TIMESTAMP,
    approved_by                     VARCHAR(255),
    contract_price                  NUMERIC(15,2),
    copay_amount                    NUMERIC(15,2),
    copay_percentage                NUMERIC(10,2),
    coverage_percent_snapshot       INTEGER,
    created_at                      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by                      VARCHAR(255),
    currency                        VARCHAR(20),
    diagnosis_code                  VARCHAR(100),
    diagnosis_description           TEXT,
    expected_service_date           DATE,
    expiry_date                     DATE,
    insurance_covered_amount        NUMERIC(15,2),
    medical_service_id              BIGINT,
    member_id                       BIGINT,
    notes                           TEXT,
    patient_copay_percent_snapshot  INTEGER,
    pre_auth_number                 VARCHAR(100),
    priority                        VARCHAR(50),
    provider_id                     BIGINT,
    reference_number                VARCHAR(100),
    rejection_reason                TEXT,
    request_date                    TIMESTAMP,
    requires_pa                     BOOLEAN,
    reserved_amount                 NUMERIC(15,2),
    service_category_id             BIGINT,
    service_category_name           VARCHAR(255),
    service_code                    VARCHAR(100),
    service_name                    VARCHAR(255),
    service_type                    VARCHAR(100),
    status                          VARCHAR(50),
    updated_at                      TIMESTAMP,
    updated_by                      VARCHAR(255),
    version                         BIGINT,
    visit_id                        BIGINT
);

CREATE INDEX IF NOT EXISTS idx_preauth_member_id   ON pre_authorizations(member_id);
CREATE INDEX IF NOT EXISTS idx_preauth_provider_id ON pre_authorizations(provider_id);
CREATE INDEX IF NOT EXISTS idx_preauth_status      ON pre_authorizations(status);

-- ----------------------------------------------------------
-- SECTION 3: Pre-authorization supporting documents
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS pre_authorization_attachments (
    id                          BIGSERIAL PRIMARY KEY,
    preauthorization_request_id BIGINT NOT NULL,
    file_name                   VARCHAR(500) NOT NULL,
    file_path                   VARCHAR(500),
    file_type                   VARCHAR(100),
    file_size                   BIGINT,
    attachment_type             VARCHAR(50),
    uploaded_by                 VARCHAR(255),
    uploaded_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_preauth_att FOREIGN KEY (preauthorization_request_id)
        REFERENCES preauthorization_requests(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------
-- SECTION 4: Pre-authorization audit trail
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS pre_authorization_audit (
    id                    BIGSERIAL PRIMARY KEY,
    pre_authorization_id  BIGINT NOT NULL,
    reference_number      VARCHAR(50),
    changed_by            VARCHAR(100) NOT NULL,
    change_date           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action                VARCHAR(20) NOT NULL,
    field_name            VARCHAR(50),
    old_value             TEXT,
    new_value             TEXT,
    notes                 VARCHAR(500),
    ip_address            VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_preauth_audit_id     ON pre_authorization_audit(pre_authorization_id);
CREATE INDEX IF NOT EXISTS idx_preauth_audit_user   ON pre_authorization_audit(changed_by);
CREATE INDEX IF NOT EXISTS idx_preauth_audit_date   ON pre_authorization_audit(change_date DESC);
CREATE INDEX IF NOT EXISTS idx_preauth_audit_action ON pre_authorization_audit(action);

-- ===== END SOURCE: V065__schema_pre_authorization.sql =====

