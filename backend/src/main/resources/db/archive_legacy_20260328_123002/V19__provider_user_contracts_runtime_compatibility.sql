-- V19__provider_user_contracts_runtime_compatibility.sql
-- Runtime compatibility patch for provider allowed employers, admin users,
-- provider contracts, and adjacent provider/visit schema drift.

-- ----------------------------------------------------------
-- visits compatibility (Visit.networkStatus)
-- ----------------------------------------------------------
ALTER TABLE visits
    ADD COLUMN IF NOT EXISTS network_status VARCHAR(30);

UPDATE visits
SET network_status = COALESCE(network_status, 'IN_NETWORK')
WHERE network_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_visits_network_status ON visits(network_status);

-- ----------------------------------------------------------
-- provider_allowed_employers compatibility (ProviderAllowedEmployer)
-- ----------------------------------------------------------
ALTER TABLE provider_allowed_employers
    ADD COLUMN IF NOT EXISTS active BOOLEAN,
    ADD COLUMN IF NOT EXISTS notes VARCHAR(500);

UPDATE provider_allowed_employers
SET active = COALESCE(active, true)
WHERE active IS NULL;

ALTER TABLE provider_allowed_employers
    ALTER COLUMN active SET DEFAULT true,
    ALTER COLUMN active SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pae_active ON provider_allowed_employers(active);

-- ----------------------------------------------------------
-- email_verification_tokens compatibility (EmailVerificationToken)
-- ----------------------------------------------------------
UPDATE email_verification_tokens
SET expiry_date = COALESCE(expiry_date, expires_at, CURRENT_TIMESTAMP + INTERVAL '24 hours')
WHERE expiry_date IS NULL;

ALTER TABLE email_verification_tokens
    ALTER COLUMN expiry_date SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours');

-- ----------------------------------------------------------
-- provider_contracts compatibility (ModernProviderContract)
-- ----------------------------------------------------------
ALTER TABLE provider_contracts
    ALTER COLUMN employer_id DROP NOT NULL;

-- ----------------------------------------------------------
-- provider_admin_documents compatibility (ProviderAdminDocument)
-- ----------------------------------------------------------
ALTER TABLE provider_admin_documents
    ADD COLUMN IF NOT EXISTS type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS file_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS document_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS expiry_date DATE,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

UPDATE provider_admin_documents
SET
    type = COALESCE(type, document_type, 'OTHER'),
    file_name = COALESCE(file_name, document_name, regexp_replace(COALESCE(file_path, ''), '^.*/', '')),
    created_at = COALESCE(created_at, uploaded_at, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, uploaded_at, created_at, CURRENT_TIMESTAMP),
    uploaded_at = COALESCE(uploaded_at, created_at, CURRENT_TIMESTAMP)
WHERE
    type IS NULL
    OR file_name IS NULL
    OR created_at IS NULL
    OR updated_at IS NULL
    OR uploaded_at IS NULL;

ALTER TABLE provider_admin_documents
    ALTER COLUMN type SET NOT NULL,
    ALTER COLUMN file_name SET NOT NULL,
    ALTER COLUMN uploaded_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN uploaded_at SET NOT NULL,
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_provider_docs_type_new ON provider_admin_documents(type);
