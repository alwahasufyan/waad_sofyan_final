-- Auto-generated consolidated migration copy (deduplicated)
-- Group: V20260324.106__financial_and_settlement.sql



-- ===== BEGIN SOURCE: V080__schema_financial.sql =====

-- ============================================================
-- V080: Financial accounts and immutable transaction ledger
-- ============================================================
-- Depends on: V006 (providers), V010 (users)

-- ----------------------------------------------------------
-- SECTION 1: Provider financial accounts
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_accounts (
    id              BIGSERIAL PRIMARY KEY,
    provider_id     BIGINT NOT NULL,
    account_type    VARCHAR(50),
    currency        VARCHAR(3) DEFAULT 'LYD',
    current_balance NUMERIC(14,2) DEFAULT 0.00,
    total_payable   NUMERIC(14,2) DEFAULT 0.00,
    version         BIGINT DEFAULT 0,   -- optimistic locking
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_account_provider   FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    CONSTRAINT chk_balance_non_negative CHECK (current_balance >= 0)
);

-- ----------------------------------------------------------
-- SECTION 2: Account transactions (INSERT-ONLY immutable ledger)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_transactions (
    id                  BIGSERIAL PRIMARY KEY,
    provider_account_id BIGINT NOT NULL,

    transaction_type VARCHAR(50)
        CHECK (transaction_type IN ('CREDIT','DEBIT')),
    amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    balance_before  NUMERIC(14,2) NOT NULL,
    balance_after   NUMERIC(14,2) NOT NULL,

    -- Source document reference
    reference_type VARCHAR(50)
        CHECK (reference_type IN ('CLAIM_APPROVAL','SETTLEMENT_PAYMENT','ADJUSTMENT')),
    reference_id     BIGINT,
    reference_number VARCHAR(100),

    description      TEXT,
    transaction_date DATE NOT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by       BIGINT,

    CONSTRAINT fk_transaction_account FOREIGN KEY (provider_account_id)
        REFERENCES provider_accounts(id) ON DELETE RESTRICT,
    CONSTRAINT chk_balance_credit CHECK (
        transaction_type != 'CREDIT' OR balance_after = balance_before + amount
    ),
    CONSTRAINT chk_balance_debit CHECK (
        transaction_type != 'DEBIT' OR balance_after = balance_before - amount
    ),
    CONSTRAINT chk_balance_non_negative CHECK (balance_before >= 0 AND balance_after >= 0)
);

CREATE INDEX IF NOT EXISTS idx_transactions_account      ON account_transactions(provider_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type         ON account_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_reference    ON account_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date         ON account_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created      ON account_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_date ON account_transactions(provider_account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_reporting    ON account_transactions(transaction_date, transaction_type, amount);

-- ===== END SOURCE: V080__schema_financial.sql =====



-- ===== BEGIN SOURCE: V081__schema_settlement.sql =====

-- ============================================================
-- V081: Settlement batches, batch items, and provider payments
-- ============================================================
-- Depends on: V006 (providers), V070 (claims), V080 (provider_accounts),
--             V010 (users)

-- ----------------------------------------------------------
-- SECTION 1: Settlement batches (monthly/periodic batch groups)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS settlement_batches (
    id              BIGINT PRIMARY KEY DEFAULT nextval('settlement_batch_seq'),
    batch_number    VARCHAR(100) NOT NULL UNIQUE,
    provider_id     BIGINT NOT NULL,

    -- Batch totals
    total_claims    INTEGER DEFAULT 0,
    total_amount    NUMERIC(14,2) NOT NULL CHECK (total_amount > 0),

    -- Status machine (DRAFT → CONFIRMED → PAID)
    status VARCHAR(50)
        CHECK (status IN ('DRAFT','CONFIRMED','PAID')),

    -- Optimistic locking
    version BIGINT DEFAULT 0,

    -- Audit
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at  TIMESTAMP,
    paid_at       TIMESTAMP,
    created_by    VARCHAR(255),
    confirmed_by  VARCHAR(255),
    paid_by       VARCHAR(255),

    CONSTRAINT fk_settlement_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_batches_provider  ON settlement_batches(provider_id);
CREATE INDEX IF NOT EXISTS idx_batches_status    ON settlement_batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_pending   ON settlement_batches(provider_id, status)
    WHERE status = 'DRAFT';
CREATE INDEX IF NOT EXISTS idx_batches_provider_date ON settlement_batches(provider_id, created_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_batches_payment_summary ON settlement_batches(status, paid_at, total_amount);

-- ----------------------------------------------------------
-- SECTION 2: Batch items (claims attached to a batch)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS settlement_batch_items (
    id          BIGSERIAL PRIMARY KEY,
    batch_id    BIGINT NOT NULL,
    claim_id    BIGINT NOT NULL,
    claim_amount NUMERIC(12,2) NOT NULL,
    added_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by    VARCHAR(255),

    CONSTRAINT fk_batch_item_batch FOREIGN KEY (batch_id)  REFERENCES settlement_batches(id) ON DELETE CASCADE,
    CONSTRAINT fk_batch_item_claim FOREIGN KEY (claim_id)  REFERENCES claims(id)             ON DELETE RESTRICT,
    CONSTRAINT uq_batch_item_claim UNIQUE (claim_id)  -- one claim per batch, prevents double-settlement
);

CREATE INDEX IF NOT EXISTS idx_batch_items_batch ON settlement_batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_items_claim ON settlement_batch_items(claim_id);

-- ----------------------------------------------------------
-- SECTION 3: Provider payment records (one payment per batch)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_payments (
    id                  BIGSERIAL PRIMARY KEY,
    settlement_batch_id BIGINT NOT NULL,
    provider_id         BIGINT NOT NULL,
    amount              NUMERIC(12,2) NOT NULL,
    payment_reference   VARCHAR(100) NOT NULL,
    payment_method      VARCHAR(50),
    payment_date        TIMESTAMP NOT NULL,
    notes               TEXT,
    created_by          BIGINT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_payments_reference  UNIQUE (payment_reference),
    CONSTRAINT uq_payments_batch      UNIQUE (settlement_batch_id),
    CONSTRAINT fk_payment_batch       FOREIGN KEY (settlement_batch_id) REFERENCES settlement_batches(id),
    CONSTRAINT fk_payment_provider    FOREIGN KEY (provider_id)         REFERENCES providers(id),
    CONSTRAINT fk_payment_created_by  FOREIGN KEY (created_by)          REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_provider_payments_provider ON provider_payments(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_payments_date     ON provider_payments(payment_date DESC);

-- ===== END SOURCE: V081__schema_settlement.sql =====



-- ===== BEGIN SOURCE: V116__make_settlement_batch_id_nullable.sql =====

-- =============================================================================
-- V116: Make provider_payments.settlement_batch_id nullable
-- =============================================================================
-- Reason: Installment payments (partial payments from provider balance) are not
-- linked to a specific settlement batch. The NOT NULL constraint was originally
-- designed for batch-only payments, but the system supports direct installment
-- payments that have no batch context.
-- =============================================================================

-- Remove NOT NULL constraint (keep the column and the FK/unique constraint intact)
ALTER TABLE provider_payments
    ALTER COLUMN settlement_batch_id DROP NOT NULL;

-- ===== END SOURCE: V116__make_settlement_batch_id_nullable.sql =====



-- ===== BEGIN SOURCE: V117__drop_settlement_batch_tables.sql =====

-- V117: Drop Settlement Batch system
-- The SettlementBatch feature has been removed. This migration cleans up the DB.

-- 1. Drop FK constraint from claims that references settlement_batches
ALTER TABLE claims DROP CONSTRAINT IF EXISTS fk_claim_settlement_batch;

-- 2. Remove FK and column from provider_payments
ALTER TABLE provider_payments DROP CONSTRAINT IF EXISTS fk_payment_batch;
ALTER TABLE provider_payments DROP CONSTRAINT IF EXISTS uq_payments_batch;
ALTER TABLE provider_payments DROP COLUMN IF EXISTS settlement_batch_id;

-- 3. Drop batch tables (items first due to FK dependency)
DROP TABLE IF EXISTS settlement_batch_items;
DROP TABLE IF EXISTS settlement_batches;

-- 4. Drop sequence
DROP SEQUENCE IF EXISTS settlement_batch_seq;

-- 5. Reset any BATCHED claims back to APPROVED
UPDATE claims SET status = 'APPROVED' WHERE status = 'BATCHED';

-- 6. Drop settlement_batch_id from claims if it exists
ALTER TABLE claims DROP COLUMN IF EXISTS settlement_batch_id;

-- ===== END SOURCE: V117__drop_settlement_batch_tables.sql =====



-- ===== BEGIN SOURCE: V237__reconcile_provider_accounts_ledger_schema.sql =====

ALTER TABLE provider_accounts
    ADD COLUMN IF NOT EXISTS running_balance NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS total_approved NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS total_paid NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS last_transaction_at TIMESTAMP;

DO $$
DECLARE
    has_legacy_current_balance BOOLEAN;
    has_legacy_total_payable BOOLEAN;
    duplicate_provider_count BIGINT;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'provider_accounts'
          AND column_name = 'current_balance'
    ) INTO has_legacy_current_balance;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'provider_accounts'
          AND column_name = 'total_payable'
    ) INTO has_legacy_total_payable;

    IF has_legacy_current_balance AND has_legacy_total_payable THEN
        EXECUTE $sql$
        WITH ledger_sums AS (
            SELECT
                provider_account_id,
                COALESCE(SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount ELSE 0 END), 0) AS total_credits,
                COALESCE(SUM(CASE WHEN transaction_type = 'DEBIT' THEN amount ELSE 0 END), 0) AS total_debits,
                COALESCE(SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount ELSE -amount END), 0) AS running_balance,
                MAX(COALESCE(created_at, transaction_date::timestamp)) AS last_transaction_at
            FROM account_transactions
            GROUP BY provider_account_id
        )
        UPDATE provider_accounts pa
        SET running_balance = COALESCE(ls.running_balance, COALESCE(pa.current_balance, 0), 0),
            total_approved = COALESCE(
                ls.total_credits,
                GREATEST(COALESCE(pa.total_payable, 0), COALESCE(pa.current_balance, 0)),
                0
            ),
            total_paid = COALESCE(
                ls.total_debits,
                GREATEST(
                    GREATEST(COALESCE(pa.total_payable, 0), COALESCE(pa.current_balance, 0)) - COALESCE(pa.current_balance, 0),
                    0
                ),
                0
            ),
            status = COALESCE(NULLIF(pa.status, ''), 'ACTIVE'),
            last_transaction_at = COALESCE(ls.last_transaction_at, pa.updated_at, pa.created_at, CURRENT_TIMESTAMP),
            version = COALESCE(pa.version, 0),
            created_at = COALESCE(pa.created_at, CURRENT_TIMESTAMP),
            updated_at = COALESCE(pa.updated_at, CURRENT_TIMESTAMP)
        FROM ledger_sums ls
        WHERE pa.id = ls.provider_account_id;
        $sql$;

        EXECUTE $sql$
        UPDATE provider_accounts pa
        SET running_balance = COALESCE(pa.running_balance, COALESCE(pa.current_balance, 0), 0),
            total_approved = COALESCE(
                pa.total_approved,
                GREATEST(COALESCE(pa.total_payable, 0), COALESCE(pa.current_balance, 0)),
                0
            ),
            total_paid = COALESCE(
                pa.total_paid,
                GREATEST(
                    GREATEST(COALESCE(pa.total_payable, 0), COALESCE(pa.current_balance, 0)) - COALESCE(pa.current_balance, 0),
                    0
                ),
                0
            ),
            status = COALESCE(NULLIF(pa.status, ''), 'ACTIVE'),
            last_transaction_at = COALESCE(pa.last_transaction_at, pa.updated_at, pa.created_at, CURRENT_TIMESTAMP),
            version = COALESCE(pa.version, 0),
            created_at = COALESCE(pa.created_at, CURRENT_TIMESTAMP),
            updated_at = COALESCE(pa.updated_at, CURRENT_TIMESTAMP)
        WHERE NOT EXISTS (
            SELECT 1
            FROM account_transactions atx
            WHERE atx.provider_account_id = pa.id
        );
        $sql$;
    ELSE
        UPDATE provider_accounts pa
        SET running_balance = COALESCE(pa.running_balance, 0),
            total_approved = COALESCE(pa.total_approved, pa.running_balance, 0),
            total_paid = COALESCE(pa.total_paid, GREATEST(COALESCE(pa.total_approved, 0) - COALESCE(pa.running_balance, 0), 0), 0),
            status = COALESCE(NULLIF(pa.status, ''), 'ACTIVE'),
            last_transaction_at = COALESCE(
                pa.last_transaction_at,
                (
                    SELECT MAX(COALESCE(atx.created_at, atx.transaction_date::timestamp))
                    FROM account_transactions atx
                    WHERE atx.provider_account_id = pa.id
                ),
                pa.updated_at,
                pa.created_at,
                CURRENT_TIMESTAMP
            ),
            version = COALESCE(pa.version, 0),
            created_at = COALESCE(pa.created_at, CURRENT_TIMESTAMP),
            updated_at = COALESCE(pa.updated_at, CURRENT_TIMESTAMP)
        WHERE pa.running_balance IS NULL
           OR pa.total_approved IS NULL
           OR pa.total_paid IS NULL
           OR pa.status IS NULL
           OR pa.last_transaction_at IS NULL
           OR pa.created_at IS NULL
           OR pa.updated_at IS NULL
           OR pa.version IS NULL;
    END IF;

    SELECT COUNT(*)
    INTO duplicate_provider_count
    FROM (
        SELECT provider_id
        FROM provider_accounts
        GROUP BY provider_id
        HAVING COUNT(*) > 1
    ) duplicate_accounts;

    IF duplicate_provider_count = 0 THEN
        CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_accounts_provider_id
            ON provider_accounts(provider_id);
    ELSE
        RAISE NOTICE 'Skipping unique index uq_provider_accounts_provider_id because duplicate provider accounts exist.';
    END IF;
END;
$$;

ALTER TABLE provider_accounts
    ALTER COLUMN running_balance SET DEFAULT 0.00,
    ALTER COLUMN total_approved SET DEFAULT 0.00,
    ALTER COLUMN total_paid SET DEFAULT 0.00,
    ALTER COLUMN status SET DEFAULT 'ACTIVE',
    ALTER COLUMN version SET DEFAULT 0,
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN running_balance SET NOT NULL,
    ALTER COLUMN total_approved SET NOT NULL,
    ALTER COLUMN total_paid SET NOT NULL,
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN version SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'provider_accounts'::regclass
          AND conname = 'chk_provider_accounts_running_balance_non_negative'
    ) THEN
        ALTER TABLE provider_accounts
            ADD CONSTRAINT chk_provider_accounts_running_balance_non_negative
            CHECK (running_balance >= 0);
    END IF;
END;
$$;

ALTER TABLE account_transactions
    DROP CONSTRAINT IF EXISTS account_transactions_reference_type_check;

ALTER TABLE account_transactions
    ADD CONSTRAINT account_transactions_reference_type_check
    CHECK (reference_type IN ('CLAIM_APPROVAL', 'SETTLEMENT_PAYMENT', 'CLAIM_SETTLEMENT', 'ADJUSTMENT'));

-- ===== END SOURCE: V237__reconcile_provider_accounts_ledger_schema.sql =====



-- ===== BEGIN SOURCE: V249__add_financial_check_constraints.sql =====

-- =================================================================================
-- V44: إضافة قيود CHECK على الأعمدة المالية في claims و claim_lines
-- الهدف: منع إدخال قيم سالبة على مستوى قاعدة البيانات
-- ملاحظة: requested_amount, unit_price, total_amount لديها بالفعل CHECK
-- =================================================================================

-- ===== claims: قيود المبالغ المالية =====
ALTER TABLE claims
    ADD CONSTRAINT chk_claims_approved_amount
    CHECK (approved_amount IS NULL OR approved_amount >= 0);

ALTER TABLE claims
    ADD CONSTRAINT chk_claims_paid_amount
    CHECK (paid_amount IS NULL OR paid_amount >= 0);

ALTER TABLE claims
    ADD CONSTRAINT chk_claims_patient_share
    CHECK (patient_share IS NULL OR patient_share >= 0);

ALTER TABLE claims
    ADD CONSTRAINT chk_claims_refused_amount
    CHECK (refused_amount IS NULL OR refused_amount >= 0);

ALTER TABLE claims
    ADD CONSTRAINT chk_claims_patient_copay
    CHECK (patient_copay IS NULL OR patient_copay >= 0);

ALTER TABLE claims
    ADD CONSTRAINT chk_claims_net_provider_amount
    CHECK (net_provider_amount IS NULL OR net_provider_amount >= 0);

ALTER TABLE claims
    ADD CONSTRAINT chk_claims_deductible_applied
    CHECK (deductible_applied IS NULL OR deductible_applied >= 0);

ALTER TABLE claims
    ADD CONSTRAINT chk_claims_copay_percent
    CHECK (copay_percent IS NULL OR (copay_percent >= 0 AND copay_percent <= 100));

-- ===== claim_lines: قيود المبالغ المالية =====
ALTER TABLE claim_lines
    ADD CONSTRAINT chk_claim_lines_approved_amount
    CHECK (approved_amount IS NULL OR approved_amount >= 0);

ALTER TABLE claim_lines
    ADD CONSTRAINT chk_claim_lines_refused_amount
    CHECK (refused_amount IS NULL OR refused_amount >= 0);

ALTER TABLE claim_lines
    ADD CONSTRAINT chk_claim_lines_quantity_positive
    CHECK (quantity > 0);

ALTER TABLE claim_lines
    ADD CONSTRAINT chk_claim_lines_benefit_limit
    CHECK (benefit_limit IS NULL OR benefit_limit >= 0);

ALTER TABLE claim_lines
    ADD CONSTRAINT chk_claim_lines_coverage_percent
    CHECK (coverage_percent_snapshot IS NULL OR (coverage_percent_snapshot >= 0 AND coverage_percent_snapshot <= 100));

-- ===== END SOURCE: V249__add_financial_check_constraints.sql =====

