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