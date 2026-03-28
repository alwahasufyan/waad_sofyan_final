-- V251: Enable INSURANCE_ADMIN role in users.user_type constraint

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_user_type;

ALTER TABLE users
    ADD CONSTRAINT chk_users_user_type
    CHECK (user_type IN (
        'SUPER_ADMIN',
        'INSURANCE_ADMIN',
        'EMPLOYER_ADMIN',
        'MEDICAL_REVIEWER',
        'PROVIDER_STAFF',
        'ACCOUNTANT',
        'FINANCE_VIEWER',
        'DATA_ENTRY'
    ));
