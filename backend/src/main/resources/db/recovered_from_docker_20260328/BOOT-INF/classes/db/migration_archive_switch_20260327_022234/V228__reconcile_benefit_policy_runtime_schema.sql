-- Reconcile legacy benefit_policies layout with the current entity model.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'benefit_policies'
    ) THEN
        ALTER TABLE benefit_policies ADD COLUMN IF NOT EXISTS name VARCHAR(255);
        ALTER TABLE benefit_policies ADD COLUMN IF NOT EXISTS start_date DATE;
        ALTER TABLE benefit_policies ADD COLUMN IF NOT EXISTS end_date DATE;

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'benefit_policies' AND column_name = 'policy_name'
        ) THEN
            UPDATE benefit_policies
            SET name = COALESCE(name, policy_name),
                policy_name = COALESCE(policy_name, name),
                start_date = COALESCE(start_date, effective_date),
                effective_date = COALESCE(effective_date, start_date),
                end_date = COALESCE(end_date, expiry_date),
                expiry_date = COALESCE(expiry_date, end_date)
            WHERE name IS NULL
               OR policy_name IS NULL
               OR start_date IS NULL
               OR effective_date IS NULL
               OR end_date IS NULL
               OR expiry_date IS NULL;

            EXECUTE $policy_fn$
                CREATE OR REPLACE FUNCTION sync_benefit_policy_legacy_columns()
                RETURNS trigger
                LANGUAGE plpgsql
                AS $body$
                BEGIN
                    NEW.name := COALESCE(NEW.name, NEW.policy_name);
                    NEW.policy_name := COALESCE(NEW.policy_name, NEW.name);

                    NEW.start_date := COALESCE(NEW.start_date, NEW.effective_date);
                    NEW.effective_date := COALESCE(NEW.effective_date, NEW.start_date);

                    NEW.end_date := COALESCE(NEW.end_date, NEW.expiry_date);
                    NEW.expiry_date := COALESCE(NEW.expiry_date, NEW.end_date);

                    RETURN NEW;
                END;
                $body$;
            $policy_fn$;

            DROP TRIGGER IF EXISTS trg_sync_benefit_policy_legacy_columns ON benefit_policies;
            CREATE TRIGGER trg_sync_benefit_policy_legacy_columns
                BEFORE INSERT OR UPDATE ON benefit_policies
                FOR EACH ROW
                EXECUTE FUNCTION sync_benefit_policy_legacy_columns();
        END IF;
    END IF;
END $$;