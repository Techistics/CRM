ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "csv_import_id" uuid REFERENCES "csv_imports"("id") ON DELETE SET NULL;
