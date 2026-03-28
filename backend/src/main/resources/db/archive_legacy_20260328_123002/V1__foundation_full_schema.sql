-- ============================================================
-- V200: Consolidated clean baseline schema
-- ============================================================
-- Purpose:
--   Clean, create-only baseline for fresh installations.
--   This migration folds historical ALTER patches into final CREATE shapes.
--
-- Rules:
--   * No ALTER TABLE statements
--   * No DROP statements
--   * Excludes removed/orphaned modules (provider mapping, provider payments,
--     settlement batch tables)
-- ============================================================

-- ----------------------------------------------------------
-- 1) Sequences
-- ----------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS user_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS employer_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS provider_seq START WITH 1 INCREMENT BY 50;

CREATE SEQUENCE IF NOT EXISTS medical_category_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS medical_service_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS medical_service_category_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS ent_service_alias_seq START WITH 1 INCREMENT BY 50;

CREATE SEQUENCE IF NOT EXISTS member_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS provider_contract_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS benefit_policy_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS claim_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS preauth_seq START WITH 1 INCREMENT BY 50;

-- ----------------------------------------------------------
-- 2) Core business master tables
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS employers (
    id BIGINT PRIMARY KEY DEFAULT nextval('employer_seq'),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,

    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),

    logo_url VARCHAR(500),
    website VARCHAR(200),
    business_type VARCHAR(100),
    tax_number VARCHAR(50),
    commercial_registration_number VARCHAR(50),

    -- Fields consolidated from V098
    cr_number VARCHAR(50),
    contract_start_date DATE,
    contract_end_date DATE,
    max_member_limit INTEGER,

    active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_employers_code ON employers(code);
CREATE INDEX IF NOT EXISTS idx_employers_active ON employers(active);
CREATE INDEX IF NOT EXISTS idx_employers_default ON employers(is_default) WHERE is_default = true;

-- Provider domain moved to V2__providers_and_allowed_employers.sql

-- ----------------------------------------------------------
