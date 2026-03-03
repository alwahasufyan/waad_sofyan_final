-- Add backlog support fields to claims table
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claim_source VARCHAR(30) DEFAULT 'NORMAL';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS legacy_reference_number VARCHAR(100);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS is_backlog BOOLEAN DEFAULT FALSE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS entered_at TIMESTAMP;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS entered_by VARCHAR(255);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS service_count INTEGER;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS attachments_count INTEGER;

-- Relax constraints in claim_lines for backlog claims
ALTER TABLE claim_lines ALTER COLUMN medical_service_id DROP NOT NULL;
ALTER TABLE claim_lines ALTER COLUMN service_category_id DROP NOT NULL;
-- unit_price and total_price are still useful but we allow them to be set manually for backlog
