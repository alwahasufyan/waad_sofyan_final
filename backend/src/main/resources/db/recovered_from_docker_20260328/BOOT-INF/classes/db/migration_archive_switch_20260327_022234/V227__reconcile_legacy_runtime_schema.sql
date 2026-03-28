-- Reconcile legacy table layouts with the current entity model.
-- This is needed for databases that had pre-V200 tables, where V200 used
-- CREATE TABLE IF NOT EXISTS and therefore did not reshape existing tables.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'providers'
    ) THEN
        ALTER TABLE providers ADD COLUMN IF NOT EXISTS name VARCHAR(200);
        ALTER TABLE providers ADD COLUMN IF NOT EXISTS email VARCHAR(100);
        ALTER TABLE providers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
        ALTER TABLE providers ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50);
        ALTER TABLE providers ADD COLUMN IF NOT EXISTS network_status VARCHAR(20);
        ALTER TABLE providers ADD COLUMN IF NOT EXISTS contract_start_date DATE;
        ALTER TABLE providers ADD COLUMN IF NOT EXISTS contract_end_date DATE;
        ALTER TABLE providers ADD COLUMN IF NOT EXISTS default_discount_rate NUMERIC(5,2);

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'providers' AND column_name = 'provider_name'
        ) THEN
            UPDATE providers
            SET name = COALESCE(name, NULLIF(provider_name_ar, ''), provider_name),
                email = COALESCE(email, contact_email),
                phone = COALESCE(phone, contact_phone),
                tax_number = COALESCE(tax_number, tax_company_code),
                network_status = COALESCE(
                    network_status,
                    CASE
                        WHEN provider_status IN ('IN_NETWORK', 'OUT_OF_NETWORK', 'PREFERRED') THEN provider_status
                        ELSE NULL
                    END
                )
            WHERE name IS NULL
               OR email IS NULL
               OR phone IS NULL
               OR tax_number IS NULL
               OR network_status IS NULL;

            EXECUTE $provider_fn$
                CREATE OR REPLACE FUNCTION sync_provider_legacy_columns()
                RETURNS trigger
                LANGUAGE plpgsql
                AS $body$
                BEGIN
                    NEW.name := COALESCE(NEW.name, NULLIF(NEW.provider_name_ar, ''), NEW.provider_name);
                    NEW.provider_name := COALESCE(NEW.provider_name, NEW.name);
                    NEW.provider_name_ar := COALESCE(NEW.provider_name_ar, NEW.name);

                    NEW.email := COALESCE(NEW.email, NEW.contact_email);
                    NEW.contact_email := COALESCE(NEW.contact_email, NEW.email);

                    NEW.phone := COALESCE(NEW.phone, NEW.contact_phone);
                    NEW.contact_phone := COALESCE(NEW.contact_phone, NEW.phone);

                    NEW.tax_number := COALESCE(NEW.tax_number, NEW.tax_company_code);
                    NEW.tax_company_code := COALESCE(NEW.tax_company_code, NEW.tax_number);

                    NEW.network_status := COALESCE(
                        NEW.network_status,
                        CASE
                            WHEN NEW.provider_status IN ('IN_NETWORK', 'OUT_OF_NETWORK', 'PREFERRED') THEN NEW.provider_status
                            ELSE NULL
                        END
                    );

                    IF NEW.provider_status IS NULL AND NEW.network_status IS NOT NULL THEN
                        NEW.provider_status := NEW.network_status;
                    END IF;

                    RETURN NEW;
                END;
                $body$;
            $provider_fn$;

            DROP TRIGGER IF EXISTS trg_sync_provider_legacy_columns ON providers;
            CREATE TRIGGER trg_sync_provider_legacy_columns
                BEFORE INSERT OR UPDATE ON providers
                FOR EACH ROW
                EXECUTE FUNCTION sync_provider_legacy_columns();
        END IF;
    END IF;
END $$;

DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'provider_contracts'
    ) THEN
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS contract_code VARCHAR(50);
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS start_date DATE;
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS end_date DATE;
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS signed_date DATE;
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(20);
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS discount_rate NUMERIC(5,2);
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS total_value NUMERIC(15,2);
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT FALSE;
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100);
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS contact_email VARCHAR(100);
        ALTER TABLE provider_contracts ADD COLUMN IF NOT EXISTS notes VARCHAR(2000);

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'provider_contracts' AND column_name = 'contract_start_date'
        ) THEN
            ALTER TABLE provider_contracts ALTER COLUMN employer_id DROP NOT NULL;
            ALTER TABLE provider_contracts ALTER COLUMN contract_number DROP NOT NULL;
            ALTER TABLE provider_contracts ALTER COLUMN contract_start_date DROP NOT NULL;

            FOR constraint_record IN
                SELECT conname
                FROM pg_constraint
                WHERE conrelid = 'provider_contracts'::regclass
                  AND contype = 'c'
                  AND pg_get_constraintdef(oid) ILIKE '%contract_status%'
            LOOP
                EXECUTE format('ALTER TABLE provider_contracts DROP CONSTRAINT %I', constraint_record.conname);
            END LOOP;

            UPDATE provider_contracts
            SET contract_code = COALESCE(contract_code, NULLIF(contract_number, ''), CONCAT('PC-', id)),
                contract_number = COALESCE(contract_number, contract_code, CONCAT('PC-', id)),
                start_date = COALESCE(start_date, contract_start_date),
                end_date = COALESCE(end_date, contract_end_date),
                signed_date = COALESCE(signed_date, start_date, contract_start_date),
                status = COALESCE(status, contract_status, 'DRAFT'),
                contract_status = COALESCE(contract_status, status, 'DRAFT'),
                pricing_model = COALESCE(pricing_model, 'DISCOUNT'),
                discount_rate = COALESCE(discount_rate, discount_percent),
                currency = COALESCE(currency, 'LYD'),
                auto_renew = COALESCE(auto_renew, FALSE)
            WHERE contract_code IS NULL
               OR start_date IS NULL
               OR status IS NULL
               OR pricing_model IS NULL
               OR currency IS NULL
               OR auto_renew IS NULL;

            EXECUTE $contract_fn$
                CREATE OR REPLACE FUNCTION sync_provider_contract_legacy_columns()
                RETURNS trigger
                LANGUAGE plpgsql
                AS $body$
                BEGIN
                    NEW.contract_code := COALESCE(NEW.contract_code, NULLIF(NEW.contract_number, ''), CONCAT('PC-', COALESCE(NEW.id, 0)));
                    NEW.contract_number := COALESCE(NEW.contract_number, NEW.contract_code);

                    NEW.start_date := COALESCE(NEW.start_date, NEW.contract_start_date);
                    NEW.contract_start_date := COALESCE(NEW.contract_start_date, NEW.start_date);

                    NEW.end_date := COALESCE(NEW.end_date, NEW.contract_end_date);
                    NEW.contract_end_date := COALESCE(NEW.contract_end_date, NEW.end_date);

                    NEW.status := COALESCE(NEW.status, NEW.contract_status, 'DRAFT');
                    NEW.contract_status := COALESCE(NEW.contract_status, NEW.status, 'DRAFT');

                    NEW.pricing_model := COALESCE(NEW.pricing_model, 'DISCOUNT');
                    NEW.discount_rate := COALESCE(NEW.discount_rate, NEW.discount_percent);
                    NEW.currency := COALESCE(NEW.currency, 'LYD');
                    NEW.auto_renew := COALESCE(NEW.auto_renew, FALSE);
                    NEW.signed_date := COALESCE(NEW.signed_date, NEW.start_date, NEW.contract_start_date);

                    RETURN NEW;
                END;
                $body$;
            $contract_fn$;

            DROP TRIGGER IF EXISTS trg_sync_provider_contract_legacy_columns ON provider_contracts;
            CREATE TRIGGER trg_sync_provider_contract_legacy_columns
                BEFORE INSERT OR UPDATE ON provider_contracts
                FOR EACH ROW
                EXECUTE FUNCTION sync_provider_contract_legacy_columns();
        END IF;

        CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_contracts_contract_code
            ON provider_contracts(contract_code)
            WHERE contract_code IS NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'visits'
    ) THEN
        ALTER TABLE visits ADD COLUMN IF NOT EXISTS complaint TEXT;
        ALTER TABLE visits ADD COLUMN IF NOT EXISTS network_status VARCHAR(30);

        UPDATE visits
        SET network_status = COALESCE(network_status, 'IN_NETWORK')
        WHERE network_status IS NULL;
    END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS member_barcode_seq START WITH 1 INCREMENT BY 1;

DO $$
DECLARE
    max_barcode_seq BIGINT;
BEGIN
    SELECT COALESCE(MAX(CAST(substring(barcode FROM '([0-9]+)$') AS BIGINT)), 0)
    INTO max_barcode_seq
    FROM members
    WHERE barcode IS NOT NULL
      AND barcode ~ '[0-9]+$';

    IF max_barcode_seq = 0 THEN
        PERFORM setval('member_barcode_seq', 1, FALSE);
    ELSE
        PERFORM setval('member_barcode_seq', max_barcode_seq, TRUE);
    END IF;
END $$;