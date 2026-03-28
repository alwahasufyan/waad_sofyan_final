-- V14__seed_initial_reference_data.sql
-- Consolidated seed/reference data from legacy migrations:
--   V095, V106, V107, V226, V238

-- ----------------------------------------------------------
-- Feature flags
-- ----------------------------------------------------------
INSERT INTO feature_flags (flag_key, flag_name, description, enabled, created_by, created_at, updated_at)
VALUES
	(
		'PROVIDER_PORTAL_ENABLED',
		'بوابة الخدمة المباشرة',
		'تفعيل بوابة إدخال المطالبات المباشرة عبر مزودي الخدمة. عند التعطيل يعمل النظام في وضع الدفعات الشهرية فقط.',
		false, 'SYSTEM', NOW(), NOW()
	),
	(
		'DIRECT_CLAIM_SUBMISSION_ENABLED',
		'التقديم المباشر للمطالبات',
		'السماح بإنشاء مطالبات فردية مباشرة من بوابة المزود. يتطلب تفعيل PROVIDER_PORTAL_ENABLED أيضاً.',
		false, 'SYSTEM', NOW(), NOW()
	),
	(
		'BATCH_CLAIMS_ENABLED',
		'نظام الدفعات الشهرية',
		'تفعيل إدخال المطالبات عبر الدفعات الشهرية. هذا هو المسار الأساسي الحالي لإدخال المطالبات.',
		true, 'SYSTEM', NOW(), NOW()
	)
ON CONFLICT (flag_key) DO NOTHING;

-- ----------------------------------------------------------
-- System settings
-- ----------------------------------------------------------
INSERT INTO system_settings (setting_key, setting_value, value_type, description, category, is_editable, default_value, validation_rules, active, created_at, updated_at)
VALUES
	('LOGO_URL',        '',               'STRING',  'رابط شعار النظام. اتركه فارغاً للشعار الافتراضي.',                              'UI',          true, '',                NULL,                                              true, NOW(), NOW()),
	('FONT_FAMILY',     'Tajawal',        'STRING',  'نوع الخط الأساسي للنظام.',                                                       'UI',          true, 'Tajawal',         'allowed:Tajawal,Cairo,Almarai,Noto Naskh Arabic', true, NOW(), NOW()),
	('FONT_SIZE_BASE',  '14',             'INTEGER', 'حجم الخط الأساسي بالبكسل.',                                                      'UI',          true, '14',              'min:12,max:18',                                   true, NOW(), NOW()),
	('SYSTEM_NAME_AR',  'نظام واعد الطبي', 'STRING', 'اسم النظام باللغة العربية — يظهر في العنوان والتقارير.',                        'UI',          true, 'نظام واعد الطبي', 'maxlength:60',                                    true, NOW(), NOW()),
	('SYSTEM_NAME_EN',  'TBA WAAD System','STRING',  'System name in English — appears in reports and API responses.',                'UI',          true, 'TBA WAAD System', 'maxlength:60',                                    true, NOW(), NOW()),
	('BENEFICIARY_NUMBER_FORMAT',  'PREFIX_SEQUENCE','STRING',  'صيغة ترقيم المستفيدين: PREFIX_SEQUENCE | YEAR_SEQUENCE | SEQUENTIAL.', 'MEMBERS', true, 'PREFIX_SEQUENCE','allowed:PREFIX_SEQUENCE,YEAR_SEQUENCE,SEQUENTIAL', true, NOW(), NOW()),
	('BENEFICIARY_NUMBER_PREFIX',  'MEM',            'STRING',  'البادئة في رقم المستفيد (مع PREFIX_SEQUENCE).',                         'MEMBERS', true, 'MEM',             'maxlength:10',                                    true, NOW(), NOW()),
	('BENEFICIARY_NUMBER_DIGITS',  '6',              'INTEGER', 'عدد أرقام الجزء التسلسلي في رقم المستفيد.',                             'MEMBERS', true, '6',               'min:4,max:10',                                    true, NOW(), NOW()),
	('ELIGIBILITY_STRICT_MODE',       'false', 'BOOLEAN', 'الوضع الصارم: رفض تلقائي لأي طلب خارج نطاق التغطية.',                      'ELIGIBILITY', true, 'false', NULL,               true, NOW(), NOW()),
	('WAITING_PERIOD_DAYS_DEFAULT',   '30',    'INTEGER', 'فترة الانتظار الافتراضية بالأيام عند إضافة مستفيد لوثيقة.',                'ELIGIBILITY', true, '30',   'min:0,max:365',    true, NOW(), NOW()),
	('ELIGIBILITY_GRACE_PERIOD_DAYS', '7',     'INTEGER', 'فترة السماح بالأيام بعد انتهاء صلاحية الوثيقة.',                           'ELIGIBILITY', true, '7',    'min:0,max:30',     true, NOW(), NOW())
ON CONFLICT (setting_key) DO NOTHING;

-- ----------------------------------------------------------
-- Foundational medical categories (roots)
-- ----------------------------------------------------------
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
SELECT 'SUB-INPAT-OPERATIONS', 'الإيواء - عمليات', 'الإيواء - عمليات', 'SUB-INPAT-OPERATIONS', 'الإيواء - عمليات', 'الإيواء - عمليات', 'INPATIENT', id, true FROM roots WHERE code = 'CAT-INPAT' UNION ALL
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

INSERT INTO medical_category_roots (category_id, root_id)
SELECT id, parent_id
FROM medical_categories
WHERE parent_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------
-- Claim rejection reasons (lookup + seed)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS claim_rejection_reasons (
	id          BIGSERIAL PRIMARY KEY,
	reason_text VARCHAR(500) NOT NULL,
	active      BOOLEAN NOT NULL DEFAULT TRUE,
	created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
	CONSTRAINT uq_claim_rejection_reason_text UNIQUE (reason_text)
);

INSERT INTO claim_rejection_reasons (reason_text) VALUES
	('تجاوز السعر المتفق عليه'),
	('الخدمة غير مغطاة'),
	('المستفيد استهلك رصيده')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------
-- Email settings default record (legacy behavior)
-- ----------------------------------------------------------
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.tables
		WHERE table_schema = 'public' AND table_name = 'email_settings'
	) THEN
		INSERT INTO email_settings (email_address, display_name, smtp_host, smtp_port, encryption_type, listener_enabled)
		SELECT 'preauth@alwahacare.com', 'Alwahacare Pre-Auth', 'smtp.hostinger.com', 587, 'TLS', FALSE
		WHERE NOT EXISTS (SELECT 1 FROM email_settings);
	END IF;
END $$;
