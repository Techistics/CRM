ALTER TABLE "custom_roles" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "reassigned_from" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_reassigned_from_users_id_fk" FOREIGN KEY ("reassigned_from") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;