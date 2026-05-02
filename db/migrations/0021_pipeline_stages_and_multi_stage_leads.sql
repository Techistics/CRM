-- Workspace-specific pipeline stages + multi-stage lead assignments
-- - Adds pipeline config tables (per tenant)
-- - Adds leads.primary_stage (single stage used for Kanban/analytics)
-- - Adds lead_stage_assignments (multi-stage support)

CREATE TABLE IF NOT EXISTS "pipeline_stages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "key" varchar(64) NOT NULL,
  "label" varchar(120) NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "meta" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "pipeline_stages_tenant_key_unique" UNIQUE("tenant_id","key")
);

DO $$ BEGIN
  ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "pipeline_stage_cooccurrence" (
  "tenant_id" uuid NOT NULL,
  "stage_key_a" varchar(64) NOT NULL,
  "stage_key_b" varchar(64) NOT NULL,
  "allowed" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "pipeline_stage_cooccurrence_pk" PRIMARY KEY("tenant_id","stage_key_a","stage_key_b")
);

DO $$ BEGIN
  ALTER TABLE "pipeline_stage_cooccurrence" ADD CONSTRAINT "pipeline_stage_cooccurrence_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "primary_stage" varchar(64);
UPDATE "leads" SET "primary_stage" = COALESCE("primary_stage", "stage") WHERE "primary_stage" IS NULL;
ALTER TABLE "leads" ALTER COLUMN "primary_stage" SET DEFAULT 'new_lead';
ALTER TABLE "leads" ALTER COLUMN "primary_stage" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "lead_stage_assignments" (
  "tenant_id" uuid NOT NULL,
  "lead_id" uuid NOT NULL,
  "stage_key" varchar(64) NOT NULL,
  "created_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "lead_stage_assignments_pk" PRIMARY KEY("lead_id","stage_key")
);

DO $$ BEGIN
  ALTER TABLE "lead_stage_assignments" ADD CONSTRAINT "lead_stage_assignments_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "lead_stage_assignments" ADD CONSTRAINT "lead_stage_assignments_lead_id_leads_id_fk"
    FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "lead_stage_assignments" ADD CONSTRAINT "lead_stage_assignments_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Backfill multi-stage assignments from existing single stage
INSERT INTO "lead_stage_assignments" ("tenant_id","lead_id","stage_key","created_at")
SELECT l."tenant_id", l."id", l."stage", now()
FROM "leads" l
WHERE l."stage" IS NOT NULL
ON CONFLICT ("lead_id","stage_key") DO NOTHING;

