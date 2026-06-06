-- Migration generated for new lead fields and tenant_timesheets table

-- Add new columns to leads table
ALTER TABLE leads
  ADD COLUMN intake_month TEXT,
  ADD COLUMN destination_country TEXT,
  ADD COLUMN program_of_interest TEXT,
  ADD COLUMN dead_reason TEXT,
  ADD COLUMN is_dead_manual BOOLEAN DEFAULT false;

-- Create tenant_timesheets table
CREATE TABLE tenant_timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  punch_in TIMESTAMPTZ NOT NULL,
  punch_out TIMESTAMPTZ,
  total_minutes INTEGER,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
