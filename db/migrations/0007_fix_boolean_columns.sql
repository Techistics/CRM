ALTER TABLE lead_document_checklist 
  ALTER COLUMN required SET DATA TYPE boolean USING (required = 'true'),
  ALTER COLUMN required SET DEFAULT false,
  ALTER COLUMN is_submitted SET DATA TYPE boolean USING (is_submitted = 'true'),
  ALTER COLUMN is_submitted SET DEFAULT false;

ALTER TABLE notifications
  ALTER COLUMN read SET DATA TYPE boolean USING (read = 'true'),
  ALTER COLUMN read SET DEFAULT false;
