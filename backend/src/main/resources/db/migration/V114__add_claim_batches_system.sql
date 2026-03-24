-- =============================================
-- V114: Claim Batches System (Real Monthly Batches)
-- =============================================

-- 1. Create the claim_batches table
CREATE TABLE IF NOT EXISTS claim_batches (
    id BIGSERIAL PRIMARY KEY,
    batch_code VARCHAR(30) NOT NULL UNIQUE,
    provider_id BIGINT NOT NULL,
    employer_id BIGINT NOT NULL,
    batch_year INT NOT NULL,
    batch_month INT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    CONSTRAINT uk_claim_batch_provider_period UNIQUE (provider_id, employer_id, batch_year, batch_month)
);

CREATE INDEX IF NOT EXISTS idx_claim_batch_lookup
    ON claim_batches (provider_id, employer_id, batch_year, batch_month);

-- 2. Add claim_batch_id to claims table
ALTER TABLE claims
ADD COLUMN IF NOT EXISTS claim_batch_id BIGINT;

-- 3. Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_claims_claim_batch'
    ) THEN
        ALTER TABLE claims
            ADD CONSTRAINT fk_claims_claim_batch
            FOREIGN KEY (claim_batch_id) REFERENCES claim_batches(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Convert legacy DRAFT claims to SETTLED/REJECTED as requested
-- First handle potential rejections (where refused >= requested)
UPDATE claims 
SET status = 'REJECTED' 
WHERE status = 'DRAFT' AND refused_amount >= requested_amount AND requested_amount > 0 AND active = true;

-- Then move the rest to SETTLED
UPDATE claims 
SET status = 'SETTLED' 
WHERE status = 'DRAFT' AND active = true;
