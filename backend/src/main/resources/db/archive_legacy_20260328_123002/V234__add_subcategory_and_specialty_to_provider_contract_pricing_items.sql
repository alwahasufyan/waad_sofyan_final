ALTER TABLE provider_contract_pricing_items
    ADD COLUMN IF NOT EXISTS sub_category_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS specialty VARCHAR(255);
