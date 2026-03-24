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
