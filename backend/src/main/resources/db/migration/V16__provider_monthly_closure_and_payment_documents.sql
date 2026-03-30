-- Provider monthly closure and provider payment documents.
-- This migration introduces monthly settlement bookkeeping primitives.

CREATE TABLE IF NOT EXISTS provider_monthly_closures (
    id              BIGSERIAL PRIMARY KEY,
    provider_id     BIGINT NOT NULL,
    closure_year    INT NOT NULL,
    closure_month   INT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'LOCKED')),
    locked_at       TIMESTAMP,
    locked_by       BIGINT,
    unlocked_at     TIMESTAMP,
    unlocked_by     BIGINT,
    unlock_reason   VARCHAR(500),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_provider_monthly_closure UNIQUE (provider_id, closure_year, closure_month),
    CONSTRAINT chk_provider_monthly_closure_month CHECK (closure_month BETWEEN 1 AND 12),
    CONSTRAINT fk_provider_monthly_closure_provider FOREIGN KEY (provider_id)
        REFERENCES providers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_provider_monthly_closure_locked_by FOREIGN KEY (locked_by)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_provider_monthly_closure_unlocked_by FOREIGN KEY (unlocked_by)
        REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_monthly_closure_provider_year
    ON provider_monthly_closures(provider_id, closure_year);

CREATE TABLE IF NOT EXISTS provider_payment_documents (
    id                     BIGSERIAL PRIMARY KEY,
    provider_id            BIGINT NOT NULL,
    account_transaction_id BIGINT,
    payment_year           INT NOT NULL,
    payment_month          INT NOT NULL,
    document_type          VARCHAR(30) NOT NULL
        CHECK (document_type IN ('PAYMENT_VOUCHER', 'RECEIPT_VOUCHER')),
    status                 VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'SUPERSEDED')),
    receipt_number         VARCHAR(40) NOT NULL UNIQUE,
    payment_reference      VARCHAR(100),
    amount                 NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    payment_date           DATE NOT NULL,
    notes                  VARCHAR(1000),
    superseded_by_id       BIGINT,
    created_by             BIGINT,
    updated_by             BIGINT,
    created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_provider_payment_documents_month CHECK (payment_month BETWEEN 1 AND 12),
    CONSTRAINT fk_provider_payment_documents_provider FOREIGN KEY (provider_id)
        REFERENCES providers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_provider_payment_documents_transaction FOREIGN KEY (account_transaction_id)
        REFERENCES account_transactions(id) ON DELETE SET NULL,
    CONSTRAINT fk_provider_payment_documents_superseded FOREIGN KEY (superseded_by_id)
        REFERENCES provider_payment_documents(id) ON DELETE SET NULL,
    CONSTRAINT fk_provider_payment_documents_created_by FOREIGN KEY (created_by)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_provider_payment_documents_updated_by FOREIGN KEY (updated_by)
        REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_payment_documents_provider_year_month
    ON provider_payment_documents(provider_id, payment_year, payment_month);

CREATE INDEX IF NOT EXISTS idx_provider_payment_documents_status
    ON provider_payment_documents(status, document_type);
