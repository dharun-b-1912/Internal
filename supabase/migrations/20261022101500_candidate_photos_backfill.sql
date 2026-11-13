INSERT INTO application_documents (id, employee_id, category, filename, data_url, status, uploaded_by, uploaded_at, reviewed_by, reviewed_at)
SELECT
  'DOC-PHOTO-' || e.id,
  e.id,
  'Candidate Photo',
  e.employee_code || '_photo.jpg',
  e.photo_data_url,
  'approved',
  COALESCE(
    (SELECT a.actor_email FROM audit_events a WHERE a.entity_id = e.id AND a.action = 'employee_created' LIMIT 1),
    (SELECT d.uploaded_by FROM application_documents d WHERE d.employee_id = e.id AND d.uploaded_by IS NOT NULL LIMIT 1),
    'HR Staff'
  ),
  COALESCE(
    (SELECT a.created_at FROM audit_events a WHERE a.entity_id = e.id AND a.action = 'employee_created' LIMIT 1),
    (SELECT d.uploaded_at FROM application_documents d WHERE d.employee_id = e.id AND d.uploaded_at IS NOT NULL LIMIT 1),
    e.date_of_joining,
    '2026-10-01T00:00:00.000Z'
  ),
  COALESCE(
    (SELECT d.reviewed_by FROM application_documents d WHERE d.employee_id = e.id AND d.reviewed_by IS NOT NULL LIMIT 1),
    'System'
  ),
  COALESCE(
    (SELECT d.reviewed_at FROM application_documents d WHERE d.employee_id = e.id AND d.reviewed_at IS NOT NULL LIMIT 1),
    (SELECT a.created_at FROM audit_events a WHERE a.entity_id = e.id AND a.action = 'employee_created' LIMIT 1)
  )
FROM employees e
WHERE e.photo_data_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM application_documents d WHERE d.employee_id = e.id AND d.category = 'Candidate Photo'
  )
ON CONFLICT (employee_id, category) DO NOTHING;
