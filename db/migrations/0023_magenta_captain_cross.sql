CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"target_user_email" text,
	"tenant_id" uuid,
	"action" text NOT NULL,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_up_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"stage" varchar(50),
	"message" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "lead_stage_assignments" (
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"stage_key" varchar(64) NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lead_stage_assignments_lead_id_stage_key_pk" PRIMARY KEY("lead_id","stage_key")
);
--> statement-breakpoint
CREATE TABLE "lead_tag_assignments" (
	"lead_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "lead_tag_assignments_lead_id_tag_id_pk" PRIMARY KEY("lead_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "lead_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "lead_tags_tenant_id_name_unique" UNIQUE("tenant_id","name")
);
--> statement-breakpoint
CREATE TABLE "lead_uploaded_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"storage_url" text NOT NULL,
	"label" text,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_whatsapp_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"direction" varchar(10) NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_stage_cooccurrence" (
	"tenant_id" uuid NOT NULL,
	"stage_key_a" varchar(64) NOT NULL,
	"stage_key_b" varchar(64) NOT NULL,
	"allowed" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pipeline_stage_cooccurrence_tenant_id_stage_key_a_stage_key_b_pk" PRIMARY KEY("tenant_id","stage_key_a","stage_key_b")
);
--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"key" varchar(64) NOT NULL,
	"label" varchar(120) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pipeline_stages_tenant_key_unique" UNIQUE("tenant_id","key")
);
--> statement-breakpoint
CREATE TABLE "tenant_timesheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"punch_in" timestamp with time zone NOT NULL,
	"punch_out" timestamp with time zone,
	"total_minutes" integer,
	"date" date NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_clerk_org_id_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_clerk_id_unique";--> statement-breakpoint
ALTER TABLE "tenant_members" DROP CONSTRAINT "tenant_members_tenant_id_user_id_pk";--> statement-breakpoint
ALTER TABLE "lead_document_checklist" ALTER COLUMN "required" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "lead_document_checklist" ALTER COLUMN "is_submitted" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "country" SET DEFAULT 'Pakistan';--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "read" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "role_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "primary_stage" varchar(64) DEFAULT 'new_lead' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "last_contacted_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "deal_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "deal_currency" varchar(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "intake_month" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "destination_country" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "program_of_interest" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "dead_reason" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "is_dead_manual" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "role_requests" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "role_requests" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "tenant_members" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_members" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reset_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reset_token_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "global_role" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_templates" ADD CONSTRAINT "follow_up_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_templates" ADD CONSTRAINT "follow_up_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_stage_assignments" ADD CONSTRAINT "lead_stage_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_stage_assignments" ADD CONSTRAINT "lead_stage_assignments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_stage_assignments" ADD CONSTRAINT "lead_stage_assignments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_tag_assignments" ADD CONSTRAINT "lead_tag_assignments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_tag_assignments" ADD CONSTRAINT "lead_tag_assignments_tag_id_lead_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."lead_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_uploaded_documents" ADD CONSTRAINT "lead_uploaded_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_uploaded_documents" ADD CONSTRAINT "lead_uploaded_documents_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_uploaded_documents" ADD CONSTRAINT "lead_uploaded_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_whatsapp_logs" ADD CONSTRAINT "lead_whatsapp_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_whatsapp_logs" ADD CONSTRAINT "lead_whatsapp_logs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_whatsapp_logs" ADD CONSTRAINT "lead_whatsapp_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stage_cooccurrence" ADD CONSTRAINT "pipeline_stage_cooccurrence_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_timesheets" ADD CONSTRAINT "tenant_timesheets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_timesheets" ADD CONSTRAINT "tenant_timesheets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_invitations_token" ON "invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_lead_stage_assignments_lead" ON "lead_stage_assignments" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_lead_stage_assignments_tenant" ON "lead_stage_assignments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tag_assignments_lead" ON "lead_tag_assignments" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_tag_assignments_tag" ON "lead_tag_assignments" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "idx_lead_tags_tenant" ON "lead_tags" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_pipeline_stage_cooccurrence_tenant" ON "pipeline_stage_cooccurrence" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_pipeline_stages_tenant" ON "pipeline_stages" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "role_requests" ADD CONSTRAINT "role_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_requests" ADD CONSTRAINT "role_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tenant_members_user_id" ON "tenant_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_members_tenant_id" ON "tenant_members" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "role_requests" DROP COLUMN "clerk_id";--> statement-breakpoint
ALTER TABLE "role_requests" DROP COLUMN "reviewed_by_clerk_id";--> statement-breakpoint
ALTER TABLE "tenants" DROP COLUMN "brand_name";--> statement-breakpoint
ALTER TABLE "tenants" DROP COLUMN "clerk_org_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "clerk_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "unq_leads_email_tenant" UNIQUE("tenant_id","email");--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "unq_leads_phone_tenant" UNIQUE("tenant_id","contact_number");--> statement-breakpoint
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_tenant_id_user_id_unique" UNIQUE("tenant_id","user_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");