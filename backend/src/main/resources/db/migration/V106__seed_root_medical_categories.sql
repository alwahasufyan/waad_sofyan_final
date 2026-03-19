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
