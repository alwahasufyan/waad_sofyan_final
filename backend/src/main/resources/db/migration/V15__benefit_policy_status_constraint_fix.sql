-- Align benefit_policies.status DB constraint with the Java enum used by the application.
-- Without this migration, soft delete / cancel / suspend / expire operations fail at runtime.

ALTER TABLE benefit_policies
    DROP CONSTRAINT IF EXISTS benefit_policies_status_check;

ALTER TABLE benefit_policies
    ADD CONSTRAINT benefit_policies_status_check
    CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'));