-- Lead Co-Assignments: tracks a single shared co-assignee per lead
-- triggered when lead reaches a pipeline stage with meta.assignmentTrigger = true

CREATE TABLE IF NOT EXISTS "lead_co_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "lead_id" uuid NOT NULL UNIQUE REFERENCES "leads"("id") ON DELETE CASCADE,
  "assigned_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "assigned_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "trigger_stage_key" varchar(64),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_lead_co_assignments_lead" ON "lead_co_assignments" ("lead_id");
CREATE INDEX IF NOT EXISTS "idx_lead_co_assignments_tenant" ON "lead_co_assignments" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_lead_co_assignments_user" ON "lead_co_assignments" ("assigned_user_id");
