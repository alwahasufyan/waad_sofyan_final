-- Benefit Policy Update for Jalyana
UPDATE benefit_policies SET annual_limit = 60000.00, default_coverage_percent = 75, status = 'ACTIVE' WHERE id = 1;
DELETE FROM benefit_policy_rules WHERE benefit_policy_id = 1;

INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 3000, true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'CAT-OUTPAT';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, NULL, true, CURRENT_TIMESTAMP, true 
FROM medical_categories WHERE code = 'CAT-INPAT';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, NULL, true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-INPAT-GENERAL';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 1500, true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-INPAT-HOME-NURSING';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 10000, true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-INPAT-PHYSIO';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 25000, true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-INPAT-WORK-INJ';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 3000, true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-INPAT-PSYCH';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 4000, true, CURRENT_TIMESTAMP, true 
FROM medical_categories WHERE code = 'SUB-INPAT-DELIVERY';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 1500, true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-OUTPAT-RAD';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, NULL, true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-OUTPAT-MRI';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 15000, true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-OUTPAT-DRUGS';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 1500, true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-OUTPAT-DEVICES';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 10000, true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-OUTPAT-PHYSIO';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, NULL, true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-OUTPAT-DENTAL-ROUTINE';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, active, created_at, requires_pre_approval) 
SELECT 1, id, 50, NULL, true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-OUTPAT-DENTAL-COSMETIC';
INSERT INTO benefit_policy_rules (benefit_policy_id, medical_category_id, coverage_percent, amount_limit, active, created_at, requires_pre_approval) 
SELECT 1, id, 75, 500, true, CURRENT_TIMESTAMP, false 
FROM medical_categories WHERE code = 'SUB-OUTPAT-GLASSES';