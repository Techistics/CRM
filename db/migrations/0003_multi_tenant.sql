-- Multi-tenant tables + tenant_id on workspace data (safe for existing rows)
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"brand_name" text,
	"clerk_org_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tenants_clerk_org_id_unique" UNIQUE("clerk_org_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant_members" (
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tenant_members_tenant_id_user_id_pk" PRIMARY KEY("tenant_id","user_id")
);
--> statement-breakpoint
-- Bootstrap workspace for existing data (replace Clerk org in Dashboard + tenants table after migrate)
INSERT INTO "tenants" ("slug", "name", "brand_name", "clerk_org_id", "status")
VALUES ('default', 'Default workspace', 'Default workspace', 'org_bootstrap_replace_me', 'active')
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "csv_imports" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "role_requests" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;--> statement-breakpoint
UPDATE "leads" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'default' LIMIT 1) WHERE "tenant_id" IS NULL;--> statement-breakpoint
UPDATE "lead_activities" SET "tenant_id" = (SELECT "tenant_id" FROM "leads" l WHERE l.id = lead_activities.lead_id LIMIT 1) WHERE "tenant_id" IS NULL;--> statement-breakpoint
UPDATE "lead_activities" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'default' LIMIT 1) WHERE "tenant_id" IS NULL;--> statement-breakpoint
UPDATE "notifications" n SET "tenant_id" = (SELECT "tenant_id" FROM "leads" l WHERE l.id = n.lead_id LIMIT 1) WHERE n."tenant_id" IS NULL AND n."lead_id" IS NOT NULL;--> statement-breakpoint
UPDATE "notifications" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'default' LIMIT 1) WHERE "tenant_id" IS NULL;--> statement-breakpoint
UPDATE "csv_imports" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'default' LIMIT 1) WHERE "tenant_id" IS NULL;--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_activities" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "csv_imports" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csv_imports" ADD CONSTRAINT "csv_imports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_requests" ADD CONSTRAINT "role_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "tenant_members" ("tenant_id", "user_id", "role")
SELECT t.id, u.id, CASE WHEN u.role = 'admin' THEN 'tenant_admin' ELSE 'agent' END
FROM "users" u
CROSS JOIN "tenants" t
WHERE t.slug = 'default'
ON CONFLICT ("tenant_id", "user_id") DO NOTHING;
