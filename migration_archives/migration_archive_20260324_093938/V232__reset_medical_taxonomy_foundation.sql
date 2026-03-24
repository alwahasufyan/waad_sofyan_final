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
