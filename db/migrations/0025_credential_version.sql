ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "credential_version" integer DEFAULT 0 NOT NULL;
ALTER TABLE "tenant_members" ADD COLUMN IF NOT EXISTS "credential_version" integer DEFAULT 0 NOT NULL;
