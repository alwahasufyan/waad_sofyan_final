-- V5__medical_taxonomy_and_catalog.sql
-- Extracted from V1 baseline during full split.

-- 5) Medical taxonomy
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS medical_categories (
    id BIGINT PRIMARY KEY DEFAULT nextval('medical_category_seq'),

    category_name VARCHAR(255) NOT NULL,
    category_name_ar VARCHAR(255),
    category_code VARCHAR(50) NOT NULL UNIQUE,

    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    name_en VARCHAR(200),
    parent_id BIGINT,

    context VARCHAR(20) NOT NULL DEFAULT 'ANY'
        CHECK (context IN ('INPATIENT','OUTPATIENT','OPERATING_ROOM','EMERGENCY','SPECIAL','ANY')),

    description TEXT,

    deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by BIGINT,

    active BOOLEAN DEFAULT true,
    coverage_percent DECIMAL(5,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),

    CONSTRAINT fk_medical_category_parent FOREIGN KEY (parent_id)
        REFERENCES medical_categories(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_medical_categories_code ON medical_categories(code);
CREATE INDEX IF NOT EXISTS idx_medical_categories_active ON medical_categories(active);
CREATE INDEX IF NOT EXISTS idx_medical_categories_parent_id ON medical_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_medical_categories_deleted ON medical_categories(deleted) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_medical_categories_deleted_code ON medical_categories(deleted, code);

CREATE TABLE IF NOT EXISTS medical_category_roots (
    category_id BIGINT NOT NULL,
    root_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (category_id, root_id),
    CONSTRAINT fk_mcr_category FOREIGN KEY (category_id) REFERENCES medical_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_mcr_root FOREIGN KEY (root_id) REFERENCES medical_categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mcr_root_id ON medical_category_roots(root_id);

CREATE TABLE IF NOT EXISTS medical_specialties (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_medical_specialties_deleted ON medical_specialties(deleted) WHERE deleted = false;

CREATE TABLE IF NOT EXISTS medical_services (
    id BIGINT PRIMARY KEY DEFAULT nextval('medical_service_seq'),

    category_id BIGINT,
    specialty_id BIGINT,

    service_name VARCHAR(255),
    service_name_ar VARCHAR(255),
    service_code VARCHAR(50) UNIQUE,

    name VARCHAR(255),
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    code VARCHAR(50),

    status VARCHAR(20) DEFAULT 'ACTIVE',
    description TEXT,

    base_price NUMERIC(10,2),
    cost NUMERIC(15,2),

    is_master BOOLEAN NOT NULL DEFAULT false,
    requires_pa BOOLEAN NOT NULL DEFAULT false,

    deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by BIGINT,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),

    CONSTRAINT fk_medical_service_category FOREIGN KEY (category_id)
        REFERENCES medical_categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_medical_service_specialty FOREIGN KEY (specialty_id)
        REFERENCES medical_specialties(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_medical_services_category ON medical_services(category_id);
CREATE INDEX IF NOT EXISTS idx_medical_services_code ON medical_services(service_code);
CREATE INDEX IF NOT EXISTS idx_medical_services_active ON medical_services(active);
CREATE INDEX IF NOT EXISTS idx_medical_services_is_master ON medical_services(is_master) WHERE deleted = false;
CREATE UNIQUE INDEX IF NOT EXISTS uq_medical_services_code_active ON medical_services(code)
    WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_medical_services_category_deleted_active ON medical_services(category_id, deleted, active);
CREATE INDEX IF NOT EXISTS idx_medical_services_active_deleted ON medical_services(active, deleted);
CREATE INDEX IF NOT EXISTS idx_medical_services_code_lower ON medical_services(LOWER(code));
CREATE INDEX IF NOT EXISTS idx_medical_services_name_ar_lower ON medical_services(LOWER(name_ar));
CREATE INDEX IF NOT EXISTS idx_medical_services_name_en_lower ON medical_services(LOWER(name_en));

CREATE TABLE IF NOT EXISTS medical_service_categories (
    id BIGINT PRIMARY KEY DEFAULT nextval('medical_service_category_seq'),
    service_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    context VARCHAR(20) NOT NULL DEFAULT 'ANY'
        CHECK (context IN ('OUTPATIENT','INPATIENT','EMERGENCY','ANY')),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),

    CONSTRAINT fk_msc_service FOREIGN KEY (service_id) REFERENCES medical_services(id) ON DELETE CASCADE,
    CONSTRAINT fk_msc_category FOREIGN KEY (category_id) REFERENCES medical_categories(id) ON DELETE RESTRICT,
    CONSTRAINT uq_msc_primary_per_context UNIQUE (service_id, context, is_primary)
        DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_msc_service_id ON medical_service_categories(service_id);
CREATE INDEX IF NOT EXISTS idx_msc_category_id ON medical_service_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_msc_context ON medical_service_categories(context);
CREATE INDEX IF NOT EXISTS idx_medical_svc_categories_category ON medical_service_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_medical_svc_categories_composite ON medical_service_categories(category_id, service_id);

CREATE TABLE IF NOT EXISTS ent_service_aliases (
    id BIGINT PRIMARY KEY DEFAULT nextval('ent_service_alias_seq'),
    medical_service_id BIGINT NOT NULL,
    alias_text VARCHAR(255) NOT NULL,
    locale VARCHAR(10) NOT NULL DEFAULT 'ar',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),

    CONSTRAINT fk_alias_service FOREIGN KEY (medical_service_id)
        REFERENCES medical_services(id) ON DELETE CASCADE,
    CONSTRAINT uq_alias_text_per_service_locale UNIQUE (medical_service_id, alias_text, locale)
);

CREATE INDEX IF NOT EXISTS idx_aliases_service_id ON ent_service_aliases(medical_service_id);
CREATE INDEX IF NOT EXISTS idx_aliases_text ON ent_service_aliases(alias_text);
CREATE INDEX IF NOT EXISTS idx_aliases_locale ON ent_service_aliases(locale);
CREATE INDEX IF NOT EXISTS idx_ent_service_aliases_text_lower ON ent_service_aliases(LOWER(alias_text));
CREATE INDEX IF NOT EXISTS idx_ent_service_aliases_service_id ON ent_service_aliases(medical_service_id);

CREATE TABLE IF NOT EXISTS cpt_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    description VARCHAR(500) NOT NULL,
    category VARCHAR(100),
    sub_category VARCHAR(100),
    procedure_type VARCHAR(20),
    standard_price NUMERIC(15,2),
    max_allowed_price NUMERIC(15,2),
    min_allowed_price NUMERIC(15,2),
    covered BOOLEAN DEFAULT true,
    co_payment_percentage NUMERIC(5,2),
    requires_pre_auth BOOLEAN DEFAULT false,
    notes VARCHAR(2000),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS icd_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    description VARCHAR(500) NOT NULL,
    category VARCHAR(50),
    sub_category VARCHAR(100),
    version VARCHAR(20),
    notes VARCHAR(2000),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- ----------------------------------------------------------
