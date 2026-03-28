-- V13__indexes_and_performance.sql
-- Extracted from V1 baseline during full split.

-- 12) Extra performance indexes from legacy V090
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_preauth_member_status_date
    ON preauthorization_requests(member_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_preauth_expiring
    ON preauthorization_requests(valid_until)
    WHERE status = 'APPROVED' AND valid_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_preauth_provider_date_status
    ON preauthorization_requests(provider_id, created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_login_attempts_failed_window
    ON user_login_attempts(username, attempted_at DESC)
    WHERE success = false;

-- NOTE: settlement_batches/provider_payments related indexes intentionally
-- omitted because those tables were removed from the system.
