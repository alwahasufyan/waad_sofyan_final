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