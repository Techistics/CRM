-- Align role_requests with tenant_members roles
-- Step 1: Add new values to enum or handle text conversion
ALTER TABLE role_requests 
  ALTER COLUMN requested_role SET DATA TYPE text;

UPDATE role_requests 
  SET requested_role = 'tenant_admin' 
  WHERE requested_role = 'admin';

UPDATE role_requests 
  SET requested_role = 'agent' 
  WHERE requested_role = 'pro';

-- No need to cast back to an enum if we're using text in Drizzle but we can add a check
ALTER TABLE role_requests 
  ADD CONSTRAINT role_requests_requested_role_check 
  CHECK (requested_role IN ('tenant_admin', 'agent'));

-- Update users table role to include super_admin
ALTER TABLE users 
  ALTER COLUMN role SET DEFAULT 'pro';

-- ensure current constraint doesn't block super_admin if there is one
ALTER TABLE users 
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users 
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'pro', 'super_admin'));
