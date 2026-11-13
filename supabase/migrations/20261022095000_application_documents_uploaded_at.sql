ALTER TABLE IF EXISTS application_documents ADD COLUMN IF NOT EXISTS uploaded_at text;

UPDATE application_documents d
SET uploaded_at = COALESCE(
  (SELECT a.created_at FROM audit_events a WHERE a.entity_id = d.employee_id AND a.action = 'employee_created' ORDER BY a.created_at ASC LIMIT 1),
  (SELECT a.created_at FROM audit_events a WHERE a.entity_id = d.employee_id AND a.action = 'employee-onboarding-submitted' ORDER BY a.created_at ASC LIMIT 1),
  (SELECT a.created_at FROM audit_events a WHERE a.entity_id = d.employee_id ORDER BY a.created_at ASC LIMIT 1),
  d.reviewed_at,
  '2026-10-01T00:00:00.000Z'
)
WHERE d.uploaded_at IS NULL;
