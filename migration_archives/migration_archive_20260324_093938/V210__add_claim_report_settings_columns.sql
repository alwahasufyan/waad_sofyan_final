-- ============================================================
-- V210: Add claim report customization columns to pdf_company_settings
-- ============================================================

ALTER TABLE pdf_company_settings 
ADD COLUMN IF NOT EXISTS claim_report_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS claim_report_primary_color VARCHAR(7),
ADD COLUMN IF NOT EXISTS claim_report_intro TEXT,
ADD COLUMN IF NOT EXISTS claim_report_footer_note TEXT,
ADD COLUMN IF NOT EXISTS claim_report_sig_right_top VARCHAR(255),
ADD COLUMN IF NOT EXISTS claim_report_sig_right_bottom VARCHAR(255),
ADD COLUMN IF NOT EXISTS claim_report_sig_left_top VARCHAR(255),
ADD COLUMN IF NOT EXISTS claim_report_sig_left_bottom VARCHAR(255);
