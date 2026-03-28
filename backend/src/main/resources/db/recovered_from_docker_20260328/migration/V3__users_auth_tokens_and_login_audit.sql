-- V3__users_auth_tokens_and_login_audit.sql
-- Extracted from V1 baseline during full split.

-- 3) Users and auth
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY DEFAULT nextval('user_seq'),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,

    user_type VARCHAR(50) NOT NULL DEFAULT 'DATA_ENTRY'
        CHECK (user_type IN (
            'SUPER_ADMIN','INSURANCE_ADMIN','EMPLOYER_ADMIN','MEDICAL_REVIEWER',
            'PROVIDER_STAFF','ACCOUNTANT','FINANCE_VIEWER','DATA_ENTRY'
        )),

    employer_id BIGINT,
    provider_id BIGINT,
    company_id BIGINT,

    enabled BOOLEAN DEFAULT true,
    account_non_expired BOOLEAN DEFAULT true,
    account_non_locked BOOLEAN DEFAULT true,
    credentials_non_expired BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,

    can_view_claims BOOLEAN DEFAULT true,
    can_view_visits BOOLEAN DEFAULT true,
    can_view_reports BOOLEAN DEFAULT true,
    can_view_members BOOLEAN DEFAULT true,
    can_view_benefit_policies BOOLEAN DEFAULT true,

    identity_verified BOOLEAN DEFAULT false,
    identity_verified_at TIMESTAMP,
    identity_verified_by VARCHAR(255),

    phone VARCHAR(50),
    profile_image_url VARCHAR(500),

    password_changed_at TIMESTAMP,
    failed_login_count INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),

    CONSTRAINT fk_user_employer FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_user_provider FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_enabled ON users(enabled);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_employer ON users(employer_id) WHERE employer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider_id) WHERE provider_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_email_verify_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_tokens_expiry ON email_verification_tokens(expiry_date);
CREATE INDEX IF NOT EXISTS idx_email_tokens_expires_at ON email_verification_tokens(expires_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_tokens_expiry ON password_reset_tokens(expiry_date);
CREATE INDEX IF NOT EXISTS idx_password_tokens_expires_at ON password_reset_tokens(expires_at);

CREATE TABLE IF NOT EXISTS user_login_attempts (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,

    attempt_result VARCHAR(20) DEFAULT 'SUCCESS'
        CHECK (attempt_result IN ('SUCCESS','FAILURE','LOCKED')),
    failure_reason VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    user_id BIGINT,
    success BOOLEAN DEFAULT false,
    failed_reason VARCHAR(255),
    attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON user_login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON user_login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_result ON user_login_attempts(attempt_result);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id_attempted ON user_login_attempts(user_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success_attempted ON user_login_attempts(success, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_failed ON user_login_attempts(username, attempted_at DESC)
    WHERE success = false;

CREATE TABLE IF NOT EXISTS user_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    username VARCHAR(255) NOT NULL DEFAULT 'SYSTEM',
    action_type VARCHAR(100) NOT NULL DEFAULT 'GENERIC',
    action_description TEXT,
    action VARCHAR(100),
    details TEXT,
    performed_by BIGINT,
    entity_type VARCHAR(100),
    entity_id BIGINT,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_username ON user_audit_log(username);
CREATE INDEX IF NOT EXISTS idx_audit_action_type ON user_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON user_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON user_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_audit_action_created ON user_audit_log(action_type, created_at DESC);

-- ----------------------------------------------------------
