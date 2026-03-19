-- Refined Benefit Policy Update for Jalyana (System Overhaul)
UPDATE benefit_policies SET annual_limit = 60000.00, default_coverage_percent = 75, status = 'ACTIVE' WHERE id = 1;
DELETE FROM benefit_policy_rules WHERE benefit_policy_id = 1;

INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, notes, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 3000.00, NULL, 'سقف العيادات الخارجية العام ويشمل الكشوفات والتحاليل الأساسية', true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'CAT-OUTPAT';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, notes, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, NULL, NULL, 'الإيواء العام داخل المستشفى بدون سقف عام مستقل', true, CURRENT_TIMESTAMP, true 
FROM medical_categories WHERE code = 'CAT-INPAT';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, notes, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, NULL, NULL, 'الإيواء العام والخدمات التمريضية الأساسية', true, CURRENT_TIMESTAMP, true 
FROM medical_categories WHERE code = 'SUB-INPAT-GENERAL';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, notes, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 1500.00, NULL, 'التمريض المنزلي بحد مالي مستقل', true, CURRENT_TIMESTAMP, true 
FROM medical_categories WHERE code = 'SUB-INPAT-HOME-NURSING';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, notes, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 10000.00, 20, 'العلاج الطبيعي أثناء الإيواء بحد أقصى 20 جلسة', true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-INPAT-PHYSIO';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, notes, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 25000.00, NULL, 'إصابات العمل كمنافع خاصة مرتبطة بالإيواء', true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-INPAT-WORK-INJ';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, notes, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 3000.00, NULL, 'الطب النفسي والجلسات المرتبطة به', true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-INPAT-PSYCH';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, notes, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 4000.00, NULL, 'الولادة الطبيعية والقيصرية', true, CURRENT_TIMESTAMP, true 
FROM medical_categories WHERE code = 'SUB-INPAT-DELIVERY';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, notes, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 4000.00, NULL, 'مضاعفات الحمل وما يرتبط بها من إقامة', true, CURRENT_TIMESTAMP, true 
FROM medical_categories WHERE code = 'SUB-INPAT-PREG-COMP';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, notes, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, NULL, NULL, 'التصنيف العام للعيادات الخارجية', true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-OUTPAT-GENERAL';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, notes, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 1500.00, NULL, 'الأشعة العامة ضمن العيادات الخارجية', true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-OUTPAT-RAD';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, notes, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, NULL, NULL, 'الرنين المغناطيسي والأشعة المتقدمة', true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-OUTPAT-MRI';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, notes, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 15000.00, NULL, 'العلاجات والأدوية في العيادات الخارجية', true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-OUTPAT-DRUGS';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, notes, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 1500.00, NULL, 'الأجهزة والمعدات الطبية', true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-OUTPAT-DEVICES';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, notes, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 10000.00, 20, 'العلاج الطبيعي في العيادات الخارجية بحد أقصى 20 جلسة', true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-OUTPAT-PHYSIO';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, notes, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, NULL, NULL, 'خدمات الأسنان الروتينية', true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-OUTPAT-DENTAL-ROUTINE';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, notes, active, created_at, requires_pre_approval) 
SELECT 1, id, 50, NULL, NULL, 'خدمات الأسنان التجميلية والتركيبات', true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-OUTPAT-DENTAL-COSMETIC';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, times_limit, notes, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 500.00, 1, 'النظارة الطبية مرة واحدة سنوياً', true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-OUTPAT-GLASSES';