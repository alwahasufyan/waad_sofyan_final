-- Reconcile legacy provider_contract_pricing_items layout with the current entity.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'provider_contract_pricing_items'
    ) THEN
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS service_name VARCHAR(255);
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS service_code VARCHAR(50);
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS category_name VARCHAR(255);
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS medical_category_id BIGINT;
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS base_price NUMERIC(15,2);
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS contract_price NUMERIC(15,2);
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2);
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS notes VARCHAR(2000);
        ALTER TABLE provider_contract_pricing_items ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'provider_contract_pricing_items' AND column_name = 'service_category'
        ) THEN
            UPDATE provider_contract_pricing_items
            SET category_name = COALESCE(category_name, service_category),
                base_price = COALESCE(base_price, unit_price, 0),
                contract_price = COALESCE(contract_price, unit_price, 0),
                discount_percent = COALESCE(discount_percent, 0),
                quantity = COALESCE(quantity, 0),
                unit = COALESCE(unit, 'service'),
                currency = COALESCE(currency, 'LYD')
            WHERE category_name IS NULL
               OR base_price IS NULL
               OR contract_price IS NULL
               OR discount_percent IS NULL
               OR quantity IS NULL
               OR unit IS NULL
               OR currency IS NULL;

            EXECUTE $pricing_fn$
                CREATE OR REPLACE FUNCTION sync_provider_contract_pricing_legacy_columns()
                RETURNS trigger
                LANGUAGE plpgsql
                AS $body$
                BEGIN
                    NEW.category_name := COALESCE(NEW.category_name, NEW.service_category);
                    NEW.service_category := COALESCE(NEW.service_category, NEW.category_name);

                    NEW.base_price := COALESCE(NEW.base_price, NEW.unit_price, 0);
                    NEW.contract_price := COALESCE(NEW.contract_price, NEW.unit_price, NEW.base_price, 0);
                    NEW.unit_price := COALESCE(NEW.unit_price, NEW.contract_price, NEW.base_price, 0);

                    NEW.discount_percent := COALESCE(NEW.discount_percent, 0);
                    NEW.quantity := COALESCE(NEW.quantity, 0);
                    NEW.unit := COALESCE(NEW.unit, 'service');
                    NEW.currency := COALESCE(NEW.currency, 'LYD');

                    RETURN NEW;
                END;
                $body$;
            $pricing_fn$;

            DROP TRIGGER IF EXISTS trg_sync_provider_contract_pricing_legacy_columns ON provider_contract_pricing_items;
            CREATE TRIGGER trg_sync_provider_contract_pricing_legacy_columns
                BEFORE INSERT OR UPDATE ON provider_contract_pricing_items
                FOR EACH ROW
                EXECUTE FUNCTION sync_provider_contract_pricing_legacy_columns();
        END IF;
    END IF;
END $$;