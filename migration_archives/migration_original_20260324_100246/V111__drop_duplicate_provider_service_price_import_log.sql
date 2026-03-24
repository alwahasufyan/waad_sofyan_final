-- ============================================================
-- V111: Drop duplicate provider_service_price_import_log table
-- ============================================================
-- The V030 schema correctly created the plural version 'provider_service_price_import_logs'.
-- A singular version 'provider_service_price_import_log' might have been created
-- due to JPA auto-ddl generation differences or older migrations. 
-- We drop the singular variant to remove ambiguity and duplication.

DROP TABLE IF EXISTS provider_service_price_import_log;
