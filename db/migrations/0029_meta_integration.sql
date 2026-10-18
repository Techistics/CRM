-- Meta Lead Ads integration tables
-- 1. meta_connections   – one Facebook Page per row per tenant
-- 2. meta_form_mappings – maps a Meta lead-gen form to CRM fields
-- 3. meta_webhook_events – raw inbound webhook events (idempotent via leadgen_id UNIQUE)

---------------------------------------------------------------------------
-- 1. meta_connections
---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "meta_connections" (
  "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"            uuid NOT NULL,
  "page_id"              text NOT NULL,
  "page_name"            text,
  "page_token"           text NOT NULL,
  "default_assignee_id"  uuid,
  "status"               text NOT NULL DEFAULT 'active',
  "created_at"           timestamp DEFAULT now(),
  "updated_at"           timestamp DEFAULT now(),
  CONSTRAINT "meta_connections_page_id_unique" UNIQUE("page_id")
);

DO $$ BEGIN
  ALTER TABLE "meta_connections"
    ADD CONSTRAINT "meta_connections_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "meta_connections"
    ADD CONSTRAINT "meta_connections_default_assignee_id_users_id_fk"
    FOREIGN KEY ("default_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_meta_connections_tenant" ON "meta_connections" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_meta_connections_status" ON "meta_connections" ("status");

---------------------------------------------------------------------------
-- 2. meta_form_mappings
---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "meta_form_mappings" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "connection_id" uuid NOT NULL,
  "form_id"       text NOT NULL,
  "form_name"     text,
  "campaign_name" text,
  "field_map"     jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at"    timestamp DEFAULT now(),
  CONSTRAINT "meta_form_mappings_form_id_unique" UNIQUE("form_id")
);

DO $$ BEGIN
  ALTER TABLE "meta_form_mappings"
    ADD CONSTRAINT "meta_form_mappings_connection_id_meta_connections_id_fk"
    FOREIGN KEY ("connection_id") REFERENCES "public"."meta_connections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_meta_form_mappings_connection" ON "meta_form_mappings" ("connection_id");

---------------------------------------------------------------------------
-- 3. meta_webhook_events
---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "meta_webhook_events" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "leadgen_id"   text NOT NULL,
  "page_id"      text NOT NULL,
  "form_id"      text,
  "tenant_id"    uuid,
  "payload"      jsonb NOT NULL,
  "status"       text NOT NULL DEFAULT 'received',
  "error"        text,
  "retry_count"  integer NOT NULL DEFAULT 0,
  "lead_id"      uuid,
  "created_at"   timestamp DEFAULT now(),
  "processed_at" timestamp,
  CONSTRAINT "meta_webhook_events_leadgen_id_unique" UNIQUE("leadgen_id")
);

DO $$ BEGIN
  ALTER TABLE "meta_webhook_events"
    ADD CONSTRAINT "meta_webhook_events_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "meta_webhook_events"
    ADD CONSTRAINT "meta_webhook_events_lead_id_leads_id_fk"
    FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Composite index requested in spec (status + created_at)
CREATE INDEX IF NOT EXISTS "idx_meta_webhook_events_status_created" ON "meta_webhook_events" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "idx_meta_webhook_events_tenant"          ON "meta_webhook_events" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_meta_webhook_events_page"            ON "meta_webhook_events" ("page_id");
