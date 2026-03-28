-- V9__visits_and_eligibility_checks.sql
-- Extracted from V1 baseline during full split.

-- 9) Visits, eligibility, preauthorization
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS visits (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    employer_id BIGINT,
    provider_id BIGINT,

    medical_category_id BIGINT,
    medical_category_name VARCHAR(200),
    medical_service_id BIGINT,
    medical_service_code VARCHAR(50),
    medical_service_name VARCHAR(200),

    doctor_name VARCHAR(255),
    specialty VARCHAR(100),
    visit_date DATE NOT NULL,
    diagnosis TEXT,
    treatment TEXT,
    total_amount NUMERIC(10,2),
    notes TEXT,

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

    eligibility_check_id BIGINT,

    version BIGINT DEFAULT 0,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_visit_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    CONSTRAINT fk_visit_employer FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE RESTRICT,
    CONSTRAINT chk_visit_date_reasonable CHECK (
        visit_date <= CURRENT_DATE AND visit_date >= CURRENT_DATE - INTERVAL '10 years'
    )
);

CREATE INDEX IF NOT EXISTS idx_visits_member ON visits(member_id);
CREATE INDEX IF NOT EXISTS idx_visits_employer ON visits(employer_id);
CREATE INDEX IF NOT EXISTS idx_visits_provider ON visits(provider_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_member_date ON visits(member_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_provider_date ON visits(provider_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_category ON visits(medical_category_id) WHERE medical_category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visits_service ON visits(medical_service_id) WHERE medical_service_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS visit_attachments (
    id BIGSERIAL PRIMARY KEY,
    visit_id BIGINT NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    original_file_name VARCHAR(500),
    file_key VARCHAR(500),
    file_type VARCHAR(100),
    file_size BIGINT,
    attachment_type VARCHAR(50)
        CHECK (attachment_type IN ('XRAY','MRI','CT_SCAN','LAB_RESULT','PRESCRIPTION','MEDICAL_REPORT','OTHER')),
    description TEXT,
    uploaded_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_visit_attachment FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_visit_attachments_visit ON visit_attachments(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_attachments_type ON visit_attachments(attachment_type);
CREATE INDEX IF NOT EXISTS idx_visit_attachments_visit_date ON visit_attachments(visit_id, created_at DESC);

CREATE TABLE IF NOT EXISTS eligibility_checks (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL,

    check_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_eligible BOOLEAN NOT NULL,
    eligibility_reason TEXT,
    policy_id BIGINT,
    coverage_status VARCHAR(50),
    visit_id BIGINT,
    checked_by VARCHAR(255),

    request_id VARCHAR(36) NOT NULL UNIQUE,
    check_timestamp TIMESTAMP NOT NULL,
    provider_id BIGINT,
    service_date DATE NOT NULL,
    service_code VARCHAR(50),
    eligible BOOLEAN NOT NULL,
    status VARCHAR(50) NOT NULL,
    reasons TEXT,
    member_name VARCHAR(255),
    member_civil_id VARCHAR(50),
    member_status VARCHAR(30),
    policy_number VARCHAR(100),
    policy_status VARCHAR(30),
    policy_start_date DATE,
    policy_end_date DATE,
    employer_id BIGINT,
    employer_name VARCHAR(255),
    checked_by_user_id BIGINT,
    checked_by_username VARCHAR(100),
    company_scope_id BIGINT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    processing_time_ms INTEGER,
    rules_evaluated INTEGER,
    created_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_eligibility_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    CONSTRAINT fk_eligibility_policy FOREIGN KEY (policy_id) REFERENCES benefit_policies(id) ON DELETE RESTRICT,
    CONSTRAINT uk_eligibility_request_id UNIQUE (request_id)
);

CREATE INDEX IF NOT EXISTS idx_eligibility_member ON eligibility_checks(member_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_date ON eligibility_checks(check_date DESC);
CREATE INDEX IF NOT EXISTS idx_eligibility_status ON eligibility_checks(status);
CREATE INDEX IF NOT EXISTS idx_eligibility_request_id ON eligibility_checks(request_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_policy_id ON eligibility_checks(policy_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_member_date ON eligibility_checks(member_id, check_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_eligibility_service_date ON eligibility_checks(service_date DESC);
CREATE INDEX IF NOT EXISTS idx_eligibility_scope ON eligibility_checks(company_scope_id);

