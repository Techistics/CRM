-- Multi-tenant SaaS: tenants, memberships, tenant_id on all workspace data.
-- Run after backing up your database. Adjust UUID generation if needed.

CREATE TABLE IF NOT EXISTS "tenants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "brand_name" text,
  "clerk_org_id" text NOT NULL UNIQUE,
  "status" text DEFAULT 'active' NOT NULL,
  "settings" jsonb,
  "created_at" timestamp DEFAULT now()
);

-- Default workspace for existing single-tenant data (replace clerk_org_id with your Clerk org id)
INSERT INTO "tenants" ("slug", "name", "clerk_org_id", "status")
VALUES ('default', 'Default workspace', 'org_REPLACE_ME', 'active')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS "tenant_members" (
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "tenant_members_pkey" PRIMARY KEY("tenant_id","user_id")
);

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE;
UPDATE "leads" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'default' LIMIT 1) WHERE "tenant_id" IS NULL;
ALTER TABLE "leads" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE;
UPDATE "notifications" n SET "tenant_id" = (SELECT "tenant_id" FROM "leads" l WHERE l.id = n.lead_id LIMIT 1);
UPDATE "notifications" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'default' LIMIT 1) WHERE "tenant_id" IS NULL;
ALTER TABLE "notifications" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "lead_activities" ADD COLUMN IF NOT EXISTS "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE;
UPDATE "lead_activities" a SET "tenant_id" = (SELECT "tenant_id" FROM "leads" l WHERE l.id = a.lead_id LIMIT 1);
ALTER TABLE "lead_activities" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "csv_imports" ADD COLUMN IF NOT EXISTS "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE;
UPDATE "csv_imports" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'default' LIMIT 1) WHERE "tenant_id" IS NULL;
ALTER TABLE "csv_imports" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "role_requests" ADD COLUMN IF NOT EXISTS "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE CASCADE;

-- Backfill tenant_members from legacy users.role for default tenant
INSERT INTO "tenant_members" ("tenant_id", "user_id", "role")
SELECT t.id, u.id, CASE WHEN u.role = 'admin' THEN 'tenant_admin' ELSE 'agent' END
FROM "users" u CROSS JOIN "tenants" t
WHERE t.slug = 'default'
ON CONFLICT DO NOTHING;
