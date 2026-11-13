ALTER TABLE IF EXISTS application_documents ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved';
ALTER TABLE IF EXISTS application_documents ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE IF EXISTS application_documents ADD COLUMN IF NOT EXISTS reviewed_by text;
ALTER TABLE IF EXISTS application_documents ADD COLUMN IF NOT EXISTS reviewed_at text;
ALTER TABLE IF EXISTS application_documents ADD COLUMN IF NOT EXISTS uploaded_by text;
