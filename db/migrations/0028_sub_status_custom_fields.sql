-- Custom fields per pipeline sub-status (dropdown or free text)

ALTER TABLE "pipeline_sub_statuses"
  ADD COLUMN IF NOT EXISTS "custom_fields_enabled" boolean NOT NULL DEFAULT false;

ALTER TABLE "pipeline_sub_statuses"
  ADD COLUMN IF NOT EXISTS "custom_fields" jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "sub_status_field_values" jsonb NOT NULL DEFAULT '{}'::jsonb;
