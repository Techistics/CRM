-- Enable RLS on the leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create a policy that strictly enforces tenant isolation
-- The user must set 'app.current_tenant_id' in their transaction before querying
CREATE POLICY "tenant_isolation_policy" ON leads
    AS PERMISSIVE FOR ALL
    TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Create a bypass policy for the platform super admin (optional, if they need to see all leads across workspaces)
-- CREATE POLICY "super_admin_bypass" ON leads
--     AS PERMISSIVE FOR ALL
--     TO PUBLIC
--     USING (current_setting('app.is_super_admin', true) = 'true');
