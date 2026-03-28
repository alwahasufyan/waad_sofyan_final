-- Squashed migration: V3__providers_network_documents.sql
-- Provider core, allowed employers, admin docs and mapping
-- Generated: 2026-03-28T11:35:14


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

