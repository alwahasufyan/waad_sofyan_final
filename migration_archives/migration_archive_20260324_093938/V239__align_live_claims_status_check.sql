ALTER TABLE claims
DROP CONSTRAINT IF EXISTS claims_status_check;

ALTER TABLE claims
ADD CONSTRAINT claims_status_check
CHECK (
    status IN (
        'DRAFT',
        'SUBMITTED',
        'UNDER_REVIEW',
        'NEEDS_CORRECTION',
        'APPROVAL_IN_PROGRESS',
        'APPROVED',
        'REJECTED',
        'BATCHED',
        'SETTLED'
    )
);