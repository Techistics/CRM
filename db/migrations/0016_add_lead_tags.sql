CREATE TABLE IF NOT EXISTS lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS lead_tag_assignments (
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES lead_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

--> statement-breakpoint

ALTER TABLE lead_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW() NOT NULL;

--> statement-breakpoint

ALTER TABLE lead_tag_assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
