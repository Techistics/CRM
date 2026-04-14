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
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_clerk_org_id_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_clerk_id_unique";--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "country" SET DEFAULT 'Pakistan';--> statement-breakpoint
ALTER TABLE "role_requests" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "role_requests" ADD COLUMN "reviewed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "lead_uploaded_documents" ADD CONSTRAINT "lead_uploaded_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_uploaded_documents" ADD CONSTRAINT "lead_uploaded_documents_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_uploaded_documents" ADD CONSTRAINT "lead_uploaded_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_requests" ADD CONSTRAINT "role_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_requests" ADD CONSTRAINT "role_requests_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_requests" DROP COLUMN "clerk_id";--> statement-breakpoint
ALTER TABLE "role_requests" DROP COLUMN "reviewed_by_clerk_id";--> statement-breakpoint
ALTER TABLE "tenants" DROP COLUMN "clerk_org_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "clerk_id";