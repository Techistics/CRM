CREATE TABLE IF NOT EXISTS "lead_whatsapp_logs" (
\t"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
\t"tenant_id" uuid NOT NULL,
\t"lead_id" uuid NOT NULL,
\t"user_id" uuid NOT NULL,
\t"direction" varchar(10) NOT NULL,
\t"message" text NOT NULL,
\t"created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
\tALTER TABLE "lead_whatsapp_logs" ADD CONSTRAINT "lead_whatsapp_logs_tenant_id_tenants_id_fk"
\t\tFOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
\tWHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
\tALTER TABLE "lead_whatsapp_logs" ADD CONSTRAINT "lead_whatsapp_logs_lead_id_leads_id_fk"
\t\tFOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
\tWHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
\tALTER TABLE "lead_whatsapp_logs" ADD CONSTRAINT "lead_whatsapp_logs_user_id_users_id_fk"
\t\tFOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
\tWHEN duplicate_object THEN NULL;
END $$;

