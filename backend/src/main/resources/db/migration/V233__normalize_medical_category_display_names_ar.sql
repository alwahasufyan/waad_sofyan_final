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
