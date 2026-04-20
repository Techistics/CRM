ALTER TABLE "tenants" DROP COLUMN IF EXISTS "external_org_id";
ALTER TABLE "users" DROP COLUMN IF EXISTS "external_id";
ALTER TABLE "role_requests" DROP COLUMN IF EXISTS "external_id";
ALTER TABLE "role_requests" DROP COLUMN IF EXISTS "reviewed_by_external_id";
