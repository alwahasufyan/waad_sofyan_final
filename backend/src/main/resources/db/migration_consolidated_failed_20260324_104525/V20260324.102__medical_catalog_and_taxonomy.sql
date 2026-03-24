-- Auto-generated consolidated migration copy (deduplicated)
-- Group: V20260324.102__medical_catalog_and_taxonomy.sql



-- ===== BEGIN SOURCE: V020__schema_medical_categories.sql =====

-- ============================================================
-- V020: Medical catalog — categories (Level 1)
-- ============================================================
-- Depends on: nothing (self-referencing parent_id only)

CREATE TABLE IF NOT EXISTS medical_categories (
    id              BIGINT PRIMARY KEY DEFAULT nextval('medical_category_seq'),

    -- Legacy name columns (kept for backward compatibility)
    category_name    VARCHAR(255) NOT NULL,
    category_name_ar VARCHAR(255),
    category_code    VARCHAR(50)  NOT NULL UNIQUE,

    -- Unified catalog columns
    code     VARCHAR(50)  NOT NULL UNIQUE,
    name     VARCHAR(200) NOT NULL,
    name_ar  VARCHAR(200),
    name_en  VARCHAR(200),
    parent_id BIGINT,

    -- Care-setting context
    context  VARCHAR(20) NOT NULL DEFAULT 'ANY'
        CHECK (context IN ('INPATIENT','OUTPATIENT','OPERATING_ROOM','EMERGENCY','SPECIAL','ANY')),

    description TEXT,

    -- Soft delete
    deleted     BOOLEAN NOT NULL DEFAULT false,
    deleted_at  TIMESTAMP,
    deleted_by  BIGINT,

    active      BOOLEAN DEFAULT true,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255),

    CONSTRAINT fk_medical_category_parent FOREIGN KEY (parent_id)
        REFERENCES medical_categories(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_medical_categories_code       ON medical_categories(code);
CREATE INDEX IF NOT EXISTS idx_medical_categories_active     ON medical_categories(active);
CREATE INDEX IF NOT EXISTS idx_medical_categories_parent_id  ON medical_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_medical_categories_deleted    ON medical_categories(deleted) WHERE deleted = false;

-- ===== END SOURCE: V020__schema_medical_categories.sql =====



-- ===== BEGIN SOURCE: V021__schema_medical_services.sql =====

-- ============================================================
-- V021: Medical services, multi-context categories, aliases (Level 2)
-- ============================================================
-- Depends on: V020 (medical_categories)

-- ----------------------------------------------------------
-- SECTION 1: Medical services (canonical catalog entries)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS medical_services (
    id              BIGINT PRIMARY KEY DEFAULT nextval('medical_service_seq'),
    category_id     BIGINT NOT NULL,

    -- Legacy bilingual name columns
    service_name    VARCHAR(255) NOT NULL,
    service_name_ar VARCHAR(255),
    service_code    VARCHAR(50)  NOT NULL UNIQUE,

    -- Unified catalog columns
    name     VARCHAR(255),
    name_ar  VARCHAR(255),
    name_en  VARCHAR(255),
    code     VARCHAR(50),
    cost     NUMERIC(15,2),

    -- Flags
    is_master   BOOLEAN NOT NULL DEFAULT false,
    requires_pa BOOLEAN NOT NULL DEFAULT false,

    -- Soft delete
    deleted     BOOLEAN NOT NULL DEFAULT false,
    deleted_at  TIMESTAMP,
    deleted_by  BIGINT,

    description TEXT,
    active      BOOLEAN DEFAULT true,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255),

    CONSTRAINT fk_medical_service_category FOREIGN KEY (category_id)
        REFERENCES medical_categories(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_medical_services_category  ON medical_services(category_id);
CREATE INDEX IF NOT EXISTS idx_medical_services_code      ON medical_services(service_code);
CREATE INDEX IF NOT EXISTS idx_medical_services_active    ON medical_services(active);
CREATE INDEX IF NOT EXISTS idx_medical_services_is_master ON medical_services(is_master) WHERE deleted = false;

-- Partial unique: code is unique only among non-deleted rows
CREATE UNIQUE INDEX IF NOT EXISTS uq_medical_services_code_active ON medical_services(code)
    WHERE deleted = false;

-- ----------------------------------------------------------
-- SECTION 2: Service–category multi-context junction
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS medical_service_categories (
    id          BIGINT PRIMARY KEY DEFAULT nextval('medical_service_category_seq'),
    service_id  BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    context     VARCHAR(20) NOT NULL DEFAULT 'ANY'
        CHECK (context IN ('OUTPATIENT','INPATIENT','EMERGENCY','ANY')),
    is_primary  BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  VARCHAR(255),

    CONSTRAINT fk_msc_service  FOREIGN KEY (service_id)  REFERENCES medical_services(id)   ON DELETE CASCADE,
    CONSTRAINT fk_msc_category FOREIGN KEY (category_id) REFERENCES medical_categories(id) ON DELETE RESTRICT,

    -- Only one primary mapping per service per context
    CONSTRAINT uq_msc_primary_per_context UNIQUE (service_id, context, is_primary)
        DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_msc_service_id  ON medical_service_categories(service_id);
CREATE INDEX IF NOT EXISTS idx_msc_category_id ON medical_service_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_msc_context     ON medical_service_categories(context);

-- ----------------------------------------------------------
-- SECTION 3: Service display aliases (autocomplete/search)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS ent_service_aliases (
    id                 BIGINT PRIMARY KEY DEFAULT nextval('ent_service_alias_seq'),
    medical_service_id BIGINT NOT NULL,
    alias_text         VARCHAR(255) NOT NULL,
    locale             VARCHAR(10)  NOT NULL DEFAULT 'ar',
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by         VARCHAR(255),

    CONSTRAINT fk_alias_service FOREIGN KEY (medical_service_id)
        REFERENCES medical_services(id) ON DELETE CASCADE,
    CONSTRAINT uq_alias_text_per_service_locale UNIQUE (medical_service_id, alias_text, locale)
);

CREATE INDEX IF NOT EXISTS idx_aliases_service_id ON ent_service_aliases(medical_service_id);
CREATE INDEX IF NOT EXISTS idx_aliases_text        ON ent_service_aliases(alias_text);
CREATE INDEX IF NOT EXISTS idx_aliases_locale      ON ent_service_aliases(locale);

-- ===== END SOURCE: V021__schema_medical_services.sql =====



-- ===== BEGIN SOURCE: V022__schema_medical_specialties.sql =====

-- ============================================================
-- V022: Medical specialties
-- ============================================================
-- Depends on: nothing

CREATE TABLE IF NOT EXISTS medical_specialties (
    id       BIGSERIAL PRIMARY KEY,
    code     VARCHAR(50)  NOT NULL UNIQUE,
    name_ar  VARCHAR(255) NOT NULL,
    name_en  VARCHAR(255),
    deleted  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_medical_specialties_deleted ON medical_specialties(deleted) WHERE deleted = false;

-- ===== END SOURCE: V022__schema_medical_specialties.sql =====



-- ===== BEGIN SOURCE: V023__schema_medical_codes.sql =====

-- ============================================================
-- V023: Medical codes — CPT (procedures) and ICD-10 (diagnoses)
-- ============================================================
-- Depends on: nothing

-- ----------------------------------------------------------
-- SECTION 1: CPT procedure codes
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS cpt_codes (
    id                    BIGSERIAL PRIMARY KEY,
    code                  VARCHAR(20)  NOT NULL UNIQUE,
    description           VARCHAR(500) NOT NULL,
    category              VARCHAR(100),
    sub_category          VARCHAR(100),
    procedure_type        VARCHAR(20),
    standard_price        NUMERIC(15,2),
    max_allowed_price     NUMERIC(15,2),
    min_allowed_price     NUMERIC(15,2),
    covered               BOOLEAN DEFAULT true,
    co_payment_percentage NUMERIC(5,2),
    requires_pre_auth     BOOLEAN DEFAULT false,
    notes                 VARCHAR(2000),
    active                BOOLEAN DEFAULT true,
    created_at            TIMESTAMP,
    updated_at            TIMESTAMP
);

-- ----------------------------------------------------------
-- SECTION 2: ICD-10 diagnosis codes
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS icd_codes (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(20)  NOT NULL UNIQUE,
    description VARCHAR(500) NOT NULL,
    category    VARCHAR(50),
    sub_category VARCHAR(100),
    version     VARCHAR(20),
    notes       VARCHAR(2000),
    active      BOOLEAN DEFAULT true,
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP
);

-- ===== END SOURCE: V023__schema_medical_codes.sql =====



-- ===== BEGIN SOURCE: V100__medical_catalog_performance_indexes.sql =====

-- ============================================================
-- V100: Medical Catalog Performance Indexes
-- ============================================================
-- Fixes slow GET /api/v1/medical-catalog/tree and catalog search.
-- Addresses: missing indexes on medical_services, medical_service_categories,
--            and lack of text search support for ILIKE queries.
-- ============================================================

-- ----------------------------------------------------------
-- medical_services: core lookup columns
-- ----------------------------------------------------------

-- Fast lookup by category (used in getTree JOIN and getActiveByCategoryId)
CREATE INDEX IF NOT EXISTS idx_medical_services_category_deleted_active
    ON medical_services(category_id, deleted, active);

-- Fast lookup for active-only queries (used in findByActiveTrue)
CREATE INDEX IF NOT EXISTS idx_medical_services_active_deleted
    ON medical_services(active, deleted);

-- Fast code lookup (already unique, but explicit index helps planner)
CREATE INDEX IF NOT EXISTS idx_medical_services_code_lower
    ON medical_services(LOWER(code));

-- ILIKE search on name_ar (catalog search)
CREATE INDEX IF NOT EXISTS idx_medical_services_name_ar_lower
    ON medical_services(LOWER(name_ar));

-- ILIKE search on name_en (catalog search)
CREATE INDEX IF NOT EXISTS idx_medical_services_name_en_lower
    ON medical_services(LOWER(name_en));

-- ----------------------------------------------------------
-- medical_service_categories: junction table
-- ----------------------------------------------------------

-- Already has: idx_package_services_service ON (service_id)
-- Missing: index on category_id for reverse lookup in getTree
CREATE INDEX IF NOT EXISTS idx_medical_svc_categories_category
    ON medical_service_categories(category_id);

-- Composite: supports the main tree JOIN
CREATE INDEX IF NOT EXISTS idx_medical_svc_categories_composite
    ON medical_service_categories(category_id, service_id);

-- ----------------------------------------------------------
-- medical_categories: lookup by deleted flag
-- ----------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_medical_categories_deleted_code
    ON medical_categories(deleted, code);

-- ----------------------------------------------------------
-- ent_service_aliases: alias search (used in catalog search ILIKE)
-- ----------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_ent_service_aliases_text_lower
    ON ent_service_aliases(LOWER(alias_text));

CREATE INDEX IF NOT EXISTS idx_ent_service_aliases_service_id
    ON ent_service_aliases(medical_service_id);

-- ===== END SOURCE: V100__medical_catalog_performance_indexes.sql =====



-- ===== BEGIN SOURCE: V101__medical_category_coverage_percent.sql =====

-- V101: Add coverage_percent to medical_categories
-- Used by the Medical Services Mapping center to track how well each
-- category's services are mapped to unified catalog entries.

ALTER TABLE medical_categories
    ADD COLUMN IF NOT EXISTS coverage_percent DECIMAL(5,2) DEFAULT NULL;

COMMENT ON COLUMN medical_categories.coverage_percent IS
    'Admin-managed target coverage percentage for this category (0–100). NULL = not set.';

-- ===== END SOURCE: V101__medical_category_coverage_percent.sql =====



-- ===== BEGIN SOURCE: V105__add_coverage_category_context_to_claims.sql =====

-- ============================================================
-- V105: Add coverage category context to claims
-- ============================================================

-- 1. Add category context fields to claims table
ALTER TABLE claims 
ADD COLUMN manual_category_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN primary_category_code VARCHAR(50);

-- 2. Add applied category fields to claim_lines table
ALTER TABLE claim_lines
ADD COLUMN applied_category_id BIGINT,
ADD COLUMN applied_category_name VARCHAR(200);

-- 3. Update existing records (optional, but good for consistency)
UPDATE claims SET manual_category_enabled = FALSE WHERE manual_category_enabled IS NULL;

-- ===== END SOURCE: V105__add_coverage_category_context_to_claims.sql =====



-- ===== BEGIN SOURCE: V106__seed_root_medical_categories.sql =====

-- ============================================================
-- V106: Seed Foundational Medical Taxonomy
-- ============================================================

-- Root categories are intentionally simplified to match the operational
-- benefit/pricing model: inpatient boarding versus outpatient clinics.

INSERT INTO medical_categories (
	category_code,
	category_name,
	category_name_ar,
	code,
	name,
	name_ar,
	context,
	parent_id,
	active
)
VALUES
('CAT-INPAT', 'الإيواء', 'الإيواء', 'CAT-INPAT', 'الإيواء', 'الإيواء', 'INPATIENT', NULL, true),
('CAT-OUTPAT', 'العيادات الخارجية', 'العيادات الخارجية', 'CAT-OUTPAT', 'العيادات الخارجية', 'العيادات الخارجية', 'OUTPATIENT', NULL, true)
ON CONFLICT (code) DO UPDATE
SET category_name = EXCLUDED.category_name,
	category_name_ar = EXCLUDED.category_name_ar,
	category_code = EXCLUDED.category_code,
	name = EXCLUDED.name,
	name_ar = EXCLUDED.name_ar,
	context = EXCLUDED.context,
	parent_id = EXCLUDED.parent_id,
	active = EXCLUDED.active;

WITH roots AS (
	SELECT id, code
	FROM medical_categories
	WHERE parent_id IS NULL
	  AND code IN ('CAT-INPAT', 'CAT-OUTPAT')
)
INSERT INTO medical_categories (
	category_code,
	category_name,
	category_name_ar,
	code,
	name,
	name_ar,
	context,
	parent_id,
	active
)
SELECT 'SUB-INPAT-GENERAL', 'الإيواء - عام', 'الإيواء - عام', 'SUB-INPAT-GENERAL', 'الإيواء - عام', 'الإيواء - عام', 'INPATIENT', id, true FROM roots WHERE code = 'CAT-INPAT' UNION ALL
SELECT 'SUB-INPAT-HOME-NURSING', 'الإيواء - تمريض منزلي', 'الإيواء - تمريض منزلي', 'SUB-INPAT-HOME-NURSING', 'الإيواء - تمريض منزلي', 'الإيواء - تمريض منزلي', 'INPATIENT', id, true FROM roots WHERE code = 'CAT-INPAT' UNION ALL
SELECT 'SUB-INPAT-PHYSIO', 'الإيواء - علاج طبيعي', 'الإيواء - علاج طبيعي', 'SUB-INPAT-PHYSIO', 'الإيواء - علاج طبيعي', 'الإيواء - علاج طبيعي', 'INPATIENT', id, true FROM roots WHERE code = 'CAT-INPAT' UNION ALL
SELECT 'SUB-INPAT-WORK-INJ', 'الإيواء - إصابات عمل', 'الإيواء - إصابات عمل', 'SUB-INPAT-WORK-INJ', 'الإيواء - إصابات عمل', 'الإيواء - إصابات عمل', 'INPATIENT', id, true FROM roots WHERE code = 'CAT-INPAT' UNION ALL
SELECT 'SUB-INPAT-PSYCH', 'الإيواء - طب نفسي', 'الإيواء - طب نفسي', 'SUB-INPAT-PSYCH', 'الإيواء - طب نفسي', 'الإيواء - طب نفسي', 'INPATIENT', id, true FROM roots WHERE code = 'CAT-INPAT' UNION ALL
SELECT 'SUB-INPAT-DELIVERY', 'الإيواء - ولادة طبيعية وقيصرية', 'الإيواء - ولادة طبيعية وقيصرية', 'SUB-INPAT-DELIVERY', 'الإيواء - ولادة طبيعية وقيصرية', 'الإيواء - ولادة طبيعية وقيصرية', 'INPATIENT', id, true FROM roots WHERE code = 'CAT-INPAT' UNION ALL
SELECT 'SUB-INPAT-PREG-COMP', 'الإيواء - مضاعفات حمل', 'الإيواء - مضاعفات حمل', 'SUB-INPAT-PREG-COMP', 'الإيواء - مضاعفات حمل', 'الإيواء - مضاعفات حمل', 'INPATIENT', id, true FROM roots WHERE code = 'CAT-INPAT' UNION ALL
SELECT 'SUB-OUTPAT-GENERAL', 'العيادات الخارجية - عام', 'العيادات الخارجية - عام', 'SUB-OUTPAT-GENERAL', 'العيادات الخارجية - عام', 'العيادات الخارجية - عام', 'OUTPATIENT', id, true FROM roots WHERE code = 'CAT-OUTPAT' UNION ALL
SELECT 'SUB-OUTPAT-RAD', 'العيادات الخارجية - أشعة', 'العيادات الخارجية - أشعة', 'SUB-OUTPAT-RAD', 'العيادات الخارجية - أشعة', 'العيادات الخارجية - أشعة', 'OUTPATIENT', id, true FROM roots WHERE code = 'CAT-OUTPAT' UNION ALL
SELECT 'SUB-OUTPAT-MRI', 'العيادات الخارجية - رنين مغناطيسي', 'العيادات الخارجية - رنين مغناطيسي', 'SUB-OUTPAT-MRI', 'العيادات الخارجية - رنين مغناطيسي', 'العيادات الخارجية - رنين مغناطيسي', 'OUTPATIENT', id, true FROM roots WHERE code = 'CAT-OUTPAT' UNION ALL
SELECT 'SUB-OUTPAT-DRUGS', 'العيادات الخارجية - علاجات وأدوية', 'العيادات الخارجية - علاجات وأدوية', 'SUB-OUTPAT-DRUGS', 'العيادات الخارجية - علاجات وأدوية', 'العيادات الخارجية - علاجات وأدوية', 'OUTPATIENT', id, true FROM roots WHERE code = 'CAT-OUTPAT' UNION ALL
SELECT 'SUB-OUTPAT-DEVICES', 'العيادات الخارجية - أجهزة ومعدات', 'العيادات الخارجية - أجهزة ومعدات', 'SUB-OUTPAT-DEVICES', 'العيادات الخارجية - أجهزة ومعدات', 'العيادات الخارجية - أجهزة ومعدات', 'OUTPATIENT', id, true FROM roots WHERE code = 'CAT-OUTPAT' UNION ALL
SELECT 'SUB-OUTPAT-PHYSIO', 'العيادات الخارجية - علاج طبيعي', 'العيادات الخارجية - علاج طبيعي', 'SUB-OUTPAT-PHYSIO', 'العيادات الخارجية - علاج طبيعي', 'العيادات الخارجية - علاج طبيعي', 'OUTPATIENT', id, true FROM roots WHERE code = 'CAT-OUTPAT' UNION ALL
SELECT 'SUB-OUTPAT-DENTAL-ROUTINE', 'العيادات الخارجية - أسنان روتيني', 'العيادات الخارجية - أسنان روتيني', 'SUB-OUTPAT-DENTAL-ROUTINE', 'العيادات الخارجية - أسنان روتيني', 'العيادات الخارجية - أسنان روتيني', 'OUTPATIENT', id, true FROM roots WHERE code = 'CAT-OUTPAT' UNION ALL
SELECT 'SUB-OUTPAT-DENTAL-COSMETIC', 'العيادات الخارجية - أسنان تجميلي', 'العيادات الخارجية - أسنان تجميلي', 'SUB-OUTPAT-DENTAL-COSMETIC', 'العيادات الخارجية - أسنان تجميلي', 'العيادات الخارجية - أسنان تجميلي', 'OUTPATIENT', id, true FROM roots WHERE code = 'CAT-OUTPAT' UNION ALL
SELECT 'SUB-OUTPAT-GLASSES', 'العيادات الخارجية - النظارة الطبية', 'العيادات الخارجية - النظارة الطبية', 'SUB-OUTPAT-GLASSES', 'العيادات الخارجية - النظارة الطبية', 'العيادات الخارجية - النظارة الطبية', 'OUTPATIENT', id, true FROM roots WHERE code = 'CAT-OUTPAT'
ON CONFLICT (code) DO UPDATE
SET category_name = EXCLUDED.category_name,
	category_name_ar = EXCLUDED.category_name_ar,
	category_code = EXCLUDED.category_code,
	name = EXCLUDED.name,
	name_ar = EXCLUDED.name_ar,
	context = EXCLUDED.context,
	parent_id = EXCLUDED.parent_id,
	active = EXCLUDED.active;

-- ===== END SOURCE: V106__seed_root_medical_categories.sql =====



-- ===== BEGIN SOURCE: V107__allow_multiple_category_roots.sql =====

-- ============================================================
-- V107: Support Many-to-Many Roots for Medical Categories
-- ============================================================
-- Allows a sub-category (e.g. Lab) to belong to multiple roots (OP, IP, etc.)

CREATE TABLE IF NOT EXISTS medical_category_roots (
    category_id BIGINT NOT NULL,
    root_id     BIGINT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (category_id, root_id),
    CONSTRAINT fk_mcr_category FOREIGN KEY (category_id) REFERENCES medical_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_mcr_root     FOREIGN KEY (root_id)     REFERENCES medical_categories(id) ON DELETE CASCADE
);

-- Index for reverse lookup
CREATE INDEX IF NOT EXISTS idx_mcr_root_id ON medical_category_roots(root_id);

-- Migrate existing single parent_id to medical_category_roots
INSERT INTO medical_category_roots (category_id, root_id)
SELECT id, parent_id FROM medical_categories 
WHERE parent_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ===== END SOURCE: V107__allow_multiple_category_roots.sql =====



-- ===== BEGIN SOURCE: V108__make_specialty_nullable.sql =====

-- ============================================================
-- V108: Make Specialty Nullable in Medical Services
-- ============================================================
-- The user decided not to enforce medical specialty classification 
-- during service creation in the contract pricing context.

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'medical_services'
		  AND column_name = 'specialty_id'
	) THEN
		ALTER TABLE medical_services ALTER COLUMN specialty_id DROP NOT NULL;
	END IF;
END $$;

-- 2. Drop the check constraint if it exists
ALTER TABLE medical_services DROP CONSTRAINT IF EXISTS chk_service_has_specialty;

-- ===== END SOURCE: V108__make_specialty_nullable.sql =====



-- ===== BEGIN SOURCE: V232__reset_medical_taxonomy_foundation.sql =====

-- ============================================================
-- V232: Reset Medical Taxonomy Foundation
-- ============================================================

-- This migration intentionally rebuilds the development taxonomy from scratch.
-- It clears dependent references first, then reseeds the simplified hierarchy.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'benefit_policy_rules'
    ) THEN
        EXECUTE 'DELETE FROM benefit_policy_rules';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'medical_services'
    ) THEN
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'medical_services' AND column_name = 'category_id'
        ) THEN
            EXECUTE 'UPDATE medical_services SET category_id = NULL WHERE category_id IS NOT NULL';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'medical_services' AND column_name = 'sub_category_id'
        ) THEN
            EXECUTE 'UPDATE medical_services SET sub_category_id = NULL WHERE sub_category_id IS NOT NULL';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'medical_services' AND column_name = 'subcategory_id'
        ) THEN
            EXECUTE 'UPDATE medical_services SET subcategory_id = NULL WHERE subcategory_id IS NOT NULL';
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'visits' AND column_name = 'medical_category_id'
    ) THEN
        EXECUTE 'UPDATE visits SET medical_category_id = NULL WHERE medical_category_id IS NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'claims' AND column_name = 'primary_category_code'
    ) THEN
        EXECUTE 'UPDATE claims SET primary_category_code = NULL WHERE primary_category_code IS NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'claims' AND column_name = 'sub_category_code'
    ) THEN
        EXECUTE 'UPDATE claims SET sub_category_code = NULL WHERE sub_category_code IS NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'pre_authorizations' AND column_name = 'service_category_id'
    ) THEN
        EXECUTE 'UPDATE pre_authorizations SET service_category_id = NULL WHERE service_category_id IS NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'medical_category_roots'
    ) THEN
        EXECUTE 'DELETE FROM medical_category_roots';
    END IF;
END $$;

DELETE FROM medical_categories;

INSERT INTO medical_categories (
    category_code,
    category_name,
    category_name_ar,
    code,
    name,
    name_ar,
    context,
    parent_id,
    active
)
VALUES
('CAT-INPAT', 'الإيواء', 'الإيواء', 'CAT-INPAT', 'الإيواء', 'الإيواء', 'INPATIENT', NULL, true),
('CAT-OUTPAT', 'العيادات الخارجية', 'العيادات الخارجية', 'CAT-OUTPAT', 'العيادات الخارجية', 'العيادات الخارجية', 'OUTPATIENT', NULL, true);

WITH roots AS (
    SELECT id, code
    FROM medical_categories
    WHERE parent_id IS NULL
      AND code IN ('CAT-INPAT', 'CAT-OUTPAT')
)
INSERT INTO medical_categories (
    category_code,
    category_name,
    category_name_ar,
    code,
    name,
    name_ar,
    context,
    parent_id,
    active
)
SELECT 'SUB-INPAT-GENERAL', 'الإيواء - عام', 'الإيواء - عام', 'SUB-INPAT-GENERAL', 'الإيواء - عام', 'الإيواء - عام', 'INPATIENT', id, true FROM roots WHERE code = 'CAT-INPAT' UNION ALL
SELECT 'SUB-INPAT-HOME-NURSING', 'الإيواء - تمريض منزلي', 'الإيواء - تمريض منزلي', 'SUB-INPAT-HOME-NURSING', 'الإيواء - تمريض منزلي', 'الإيواء - تمريض منزلي', 'INPATIENT', id, true FROM roots WHERE code = 'CAT-INPAT' UNION ALL
SELECT 'SUB-INPAT-PHYSIO', 'الإيواء - علاج طبيعي', 'الإيواء - علاج طبيعي', 'SUB-INPAT-PHYSIO', 'الإيواء - علاج طبيعي', 'الإيواء - علاج طبيعي', 'INPATIENT', id, true FROM roots WHERE code = 'CAT-INPAT' UNION ALL
SELECT 'SUB-INPAT-WORK-INJ', 'الإيواء - إصابات عمل', 'الإيواء - إصابات عمل', 'SUB-INPAT-WORK-INJ', 'الإيواء - إصابات عمل', 'الإيواء - إصابات عمل', 'INPATIENT', id, true FROM roots WHERE code = 'CAT-INPAT' UNION ALL
SELECT 'SUB-INPAT-PSYCH', 'الإيواء - طب نفسي', 'الإيواء - طب نفسي', 'SUB-INPAT-PSYCH', 'الإيواء - طب نفسي', 'الإيواء - طب نفسي', 'INPATIENT', id, true FROM roots WHERE code = 'CAT-INPAT' UNION ALL
SELECT 'SUB-INPAT-DELIVERY', 'الإيواء - ولادة طبيعية وقيصرية', 'الإيواء - ولادة طبيعية وقيصرية', 'SUB-INPAT-DELIVERY', 'الإيواء - ولادة طبيعية وقيصرية', 'الإيواء - ولادة طبيعية وقيصرية', 'INPATIENT', id, true FROM roots WHERE code = 'CAT-INPAT' UNION ALL
SELECT 'SUB-INPAT-PREG-COMP', 'الإيواء - مضاعفات حمل', 'الإيواء - مضاعفات حمل', 'SUB-INPAT-PREG-COMP', 'الإيواء - مضاعفات حمل', 'الإيواء - مضاعفات حمل', 'INPATIENT', id, true FROM roots WHERE code = 'CAT-INPAT' UNION ALL
SELECT 'SUB-OUTPAT-GENERAL', 'العيادات الخارجية - عام', 'العيادات الخارجية - عام', 'SUB-OUTPAT-GENERAL', 'العيادات الخارجية - عام', 'العيادات الخارجية - عام', 'OUTPATIENT', id, true FROM roots WHERE code = 'CAT-OUTPAT' UNION ALL
SELECT 'SUB-OUTPAT-RAD', 'العيادات الخارجية - أشعة', 'العيادات الخارجية - أشعة', 'SUB-OUTPAT-RAD', 'العيادات الخارجية - أشعة', 'العيادات الخارجية - أشعة', 'OUTPATIENT', id, true FROM roots WHERE code = 'CAT-OUTPAT' UNION ALL
SELECT 'SUB-OUTPAT-MRI', 'العيادات الخارجية - رنين مغناطيسي', 'العيادات الخارجية - رنين مغناطيسي', 'SUB-OUTPAT-MRI', 'العيادات الخارجية - رنين مغناطيسي', 'العيادات الخارجية - رنين مغناطيسي', 'OUTPATIENT', id, true FROM roots WHERE code = 'CAT-OUTPAT' UNION ALL
SELECT 'SUB-OUTPAT-DRUGS', 'العيادات الخارجية - علاجات وأدوية', 'العيادات الخارجية - علاجات وأدوية', 'SUB-OUTPAT-DRUGS', 'العيادات الخارجية - علاجات وأدوية', 'العيادات الخارجية - علاجات وأدوية', 'OUTPATIENT', id, true FROM roots WHERE code = 'CAT-OUTPAT' UNION ALL
SELECT 'SUB-OUTPAT-DEVICES', 'العيادات الخارجية - أجهزة ومعدات', 'العيادات الخارجية - أجهزة ومعدات', 'SUB-OUTPAT-DEVICES', 'العيادات الخارجية - أجهزة ومعدات', 'العيادات الخارجية - أجهزة ومعدات', 'OUTPATIENT', id, true FROM roots WHERE code = 'CAT-OUTPAT' UNION ALL
SELECT 'SUB-OUTPAT-PHYSIO', 'العيادات الخارجية - علاج طبيعي', 'العيادات الخارجية - علاج طبيعي', 'SUB-OUTPAT-PHYSIO', 'العيادات الخارجية - علاج طبيعي', 'العيادات الخارجية - علاج طبيعي', 'OUTPATIENT', id, true FROM roots WHERE code = 'CAT-OUTPAT' UNION ALL
SELECT 'SUB-OUTPAT-DENTAL-ROUTINE', 'العيادات الخارجية - أسنان روتيني', 'العيادات الخارجية - أسنان روتيني', 'SUB-OUTPAT-DENTAL-ROUTINE', 'العيادات الخارجية - أسنان روتيني', 'العيادات الخارجية - أسنان روتيني', 'OUTPATIENT', id, true FROM roots WHERE code = 'CAT-OUTPAT' UNION ALL
SELECT 'SUB-OUTPAT-DENTAL-COSMETIC', 'العيادات الخارجية - أسنان تجميلي', 'العيادات الخارجية - أسنان تجميلي', 'SUB-OUTPAT-DENTAL-COSMETIC', 'العيادات الخارجية - أسنان تجميلي', 'العيادات الخارجية - أسنان تجميلي', 'OUTPATIENT', id, true FROM roots WHERE code = 'CAT-OUTPAT' UNION ALL
SELECT 'SUB-OUTPAT-GLASSES', 'العيادات الخارجية - النظارة الطبية', 'العيادات الخارجية - النظارة الطبية', 'SUB-OUTPAT-GLASSES', 'العيادات الخارجية - النظارة الطبية', 'العيادات الخارجية - النظارة الطبية', 'OUTPATIENT', id, true FROM roots WHERE code = 'CAT-OUTPAT';

SELECT setval(
    pg_get_serial_sequence('medical_categories', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM medical_categories), 1), 1),
    true
);

-- ===== END SOURCE: V232__reset_medical_taxonomy_foundation.sql =====



-- ===== BEGIN SOURCE: V233__normalize_medical_category_display_names_ar.sql =====

-- ============================================================
-- V233: Normalize Medical Category Display Names To Arabic
-- ============================================================

UPDATE medical_categories
SET category_name = category_name_ar,
    name = name_ar,
    updated_at = NOW()
WHERE code IN (
    'CAT-INPAT',
    'CAT-OUTPAT',
    'SUB-INPAT-GENERAL',
    'SUB-INPAT-HOME-NURSING',
    'SUB-INPAT-PHYSIO',
    'SUB-INPAT-WORK-INJ',
    'SUB-INPAT-PSYCH',
    'SUB-INPAT-DELIVERY',
    'SUB-INPAT-PREG-COMP',
    'SUB-OUTPAT-GENERAL',
    'SUB-OUTPAT-RAD',
    'SUB-OUTPAT-MRI',
    'SUB-OUTPAT-DRUGS',
    'SUB-OUTPAT-DEVICES',
    'SUB-OUTPAT-PHYSIO',
    'SUB-OUTPAT-DENTAL-ROUTINE',
    'SUB-OUTPAT-DENTAL-COSMETIC',
    'SUB-OUTPAT-GLASSES'
);

-- ===== END SOURCE: V233__normalize_medical_category_display_names_ar.sql =====



-- ===== BEGIN SOURCE: V234__add_subcategory_and_specialty_to_provider_contract_pricing_items.sql =====

ALTER TABLE provider_contract_pricing_items
    ADD COLUMN IF NOT EXISTS sub_category_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS specialty VARCHAR(255);

-- ===== END SOURCE: V234__add_subcategory_and_specialty_to_provider_contract_pricing_items.sql =====



-- ===== BEGIN SOURCE: V235__reconcile_medical_services_schema.sql =====

ALTER TABLE medical_services
    ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS specialty_id BIGINT,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

UPDATE medical_services
SET base_price = COALESCE(base_price, cost, 0)
WHERE base_price IS NULL;

UPDATE medical_services
SET status = CASE
    WHEN COALESCE(active, false) = true THEN 'ACTIVE'
    ELSE 'DRAFT'
END
WHERE status IS NULL OR status = '';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'medical_services'
          AND constraint_name = 'fk_medical_service_specialty'
    ) THEN
        ALTER TABLE medical_services
            ADD CONSTRAINT fk_medical_service_specialty
            FOREIGN KEY (specialty_id) REFERENCES medical_specialties(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- ===== END SOURCE: V235__reconcile_medical_services_schema.sql =====



-- ===== BEGIN SOURCE: V236__reconcile_medical_service_categories_schema.sql =====

ALTER TABLE medical_service_categories
    ADD COLUMN IF NOT EXISTS active BOOLEAN;

UPDATE medical_service_categories
SET active = TRUE
WHERE active IS NULL;

ALTER TABLE medical_service_categories
    ALTER COLUMN active SET DEFAULT TRUE;

ALTER TABLE medical_service_categories
    ALTER COLUMN active SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_msc_active
    ON medical_service_categories(active);

-- ===== END SOURCE: V236__reconcile_medical_service_categories_schema.sql =====



-- ===== BEGIN SOURCE: V238__add_inpatient_operations_medical_category.sql =====

WITH inpatient_root AS (
    SELECT id
    FROM medical_categories
    WHERE code = 'CAT-INPAT'
)
INSERT INTO medical_categories (
    category_code,
    category_name,
    category_name_ar,
    code,
    name,
    name_ar,
    context,
    parent_id,
    active
)
SELECT
    'SUB-INPAT-OPERATIONS',
    'الإيواء - عمليات',
    'الإيواء - عمليات',
    'SUB-INPAT-OPERATIONS',
    'الإيواء - عمليات',
    'الإيواء - عمليات',
    'INPATIENT',
    inpatient_root.id,
    true
FROM inpatient_root
WHERE NOT EXISTS (
    SELECT 1
    FROM medical_categories mc
    WHERE mc.code = 'SUB-INPAT-OPERATIONS'
);

-- ===== END SOURCE: V238__add_inpatient_operations_medical_category.sql =====



-- ===== BEGIN SOURCE: V241__add_pricing_item_sub_category_and_specialty.sql =====

-- ============================================================
-- V36: Add sub_category_name and specialty columns to provider_contract_pricing_items
-- Required for enhanced Excel price-list import with category resolution
-- ============================================================

ALTER TABLE provider_contract_pricing_items
    ADD COLUMN IF NOT EXISTS sub_category_name VARCHAR(255);

ALTER TABLE provider_contract_pricing_items
    ADD COLUMN IF NOT EXISTS specialty VARCHAR(255);


-- ===== END SOURCE: V241__add_pricing_item_sub_category_and_specialty.sql =====



-- ===== BEGIN SOURCE: V248__map_pricing_items_categories.sql =====

-- =================================================================================
-- V43: Map Unmapped Pricing Items to Medical Categories
-- Description: Unifies text-based category names into foreign key relations to 
-- avoid performance impact from runtime fuzzy matching.
-- =================================================================================

-- 1. Exact Name Matching
UPDATE provider_contract_pricing_items p
SET medical_category_id = c.id
FROM medical_categories c
WHERE p.medical_category_id IS NULL 
  AND p.category_name IS NOT NULL
  AND TRIM(p.category_name) = c.name;

-- 2. Fuzzy Match: Strip parenthetical suffixes (e.g., " (IP)" or " (OP)") and re-match
UPDATE provider_contract_pricing_items p
SET medical_category_id = c.id
FROM medical_categories c
WHERE p.medical_category_id IS NULL 
  AND p.category_name IS NOT NULL
  AND TRIM(REGEXP_REPLACE(p.category_name, '\s*\(.*?\)\s*$', '')) = c.name;


-- ===== END SOURCE: V248__map_pricing_items_categories.sql =====

