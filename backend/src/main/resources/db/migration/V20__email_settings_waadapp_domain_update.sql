-- Update legacy default email settings to the waadapp.ly mailbox.
-- This keeps stored passwords unchanged and only rewrites legacy host/address defaults.

UPDATE email_settings
SET email_address = 'info@waadapp.ly',
    display_name = CASE
        WHEN display_name IS NULL OR btrim(display_name) = '' OR lower(display_name) IN ('alwahacare pre-auth', 'waadcare', 'alwaha care support')
            THEN 'Waad App'
        ELSE display_name
    END,
    smtp_host = 'smtp.lsbox.email',
    smtp_port = 587,
    smtp_username = CASE
        WHEN smtp_username IS NULL OR btrim(smtp_username) = ''
             OR lower(smtp_username) IN ('preauth@alwahacare.com', 'support@alwahacare.com', 'info@alwahacare.com')
            THEN 'info@waadapp.ly'
        ELSE smtp_username
    END,
    encryption_type = 'TLS',
    updated_at = CURRENT_TIMESTAMP
WHERE lower(coalesce(email_address, '')) IN ('preauth@alwahacare.com', 'support@alwahacare.com', 'info@alwahacare.com')
   OR lower(coalesce(smtp_username, '')) IN ('preauth@alwahacare.com', 'support@alwahacare.com', 'info@alwahacare.com')
   OR lower(coalesce(smtp_host, '')) = 'smtp.hostinger.com';
