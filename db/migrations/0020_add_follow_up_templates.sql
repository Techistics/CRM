CREATE TABLE IF NOT EXISTS "follow_up_templates" (
\t"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
\t"tenant_id" uuid NOT NULL,
\t"name" varchar(100) NOT NULL,
\t"stage" varchar(50),
\t"message" text NOT NULL,
\t"created_by" uuid,
\t"created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
\tALTER TABLE "follow_up_templates" ADD CONSTRAINT "follow_up_templates_tenant_id_tenants_id_fk"
\t\tFOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
\tWHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
\tALTER TABLE "follow_up_templates" ADD CONSTRAINT "follow_up_templates_created_by_users_id_fk"
\t\tFOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
\tWHEN duplicate_object THEN NULL;
END $$;

