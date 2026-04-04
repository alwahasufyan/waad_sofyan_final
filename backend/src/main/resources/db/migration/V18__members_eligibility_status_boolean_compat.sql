-- Compatibility migration for legacy schemas where members.eligibility_status
-- was created as VARCHAR instead of BOOLEAN.

DO $$
DECLARE
    current_type text;
BEGIN
    SELECT data_type
    INTO current_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'members'
      AND column_name = 'eligibility_status';

    IF current_type IS NULL THEN
        ALTER TABLE members
            ADD COLUMN eligibility_status BOOLEAN NOT NULL DEFAULT true;
    ELSIF current_type <> 'boolean' THEN
        ALTER TABLE members
            ALTER COLUMN eligibility_status DROP DEFAULT;

        ALTER TABLE members
            ALTER COLUMN eligibility_status TYPE BOOLEAN
            USING CASE
                WHEN eligibility_status IS NULL THEN true
                WHEN lower(trim(eligibility_status::text)) IN ('true', 't', '1', 'yes', 'y', 'eligible', 'active') THEN true
                WHEN lower(trim(eligibility_status::text)) IN ('false', 'f', '0', 'no', 'n', 'not_eligible', 'inactive', 'blocked') THEN false
                ELSE false
            END;

        ALTER TABLE members
            ALTER COLUMN eligibility_status SET DEFAULT true;

        UPDATE members
        SET eligibility_status = true
        WHERE eligibility_status IS NULL;

        ALTER TABLE members
            ALTER COLUMN eligibility_status SET NOT NULL;
    END IF;
END $$;