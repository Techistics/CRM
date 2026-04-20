-- Phase 2: Final Production Consolidation
-- Objective: Ensure all booleans are native types and roles are normalized

-- 1. Normalize Boolean Columns using Safe Casting
-- lead_document_checklist
ALTER TABLE "lead_document_checklist" 
  ALTER COLUMN "required" TYPE boolean 
  USING (
    CASE 
      WHEN "required"::text = 'true' THEN true 
      WHEN "required"::text = 'false' THEN false 
      ELSE "required"::text::boolean 
    END
  );

ALTER TABLE "lead_document_checklist" ALTER COLUMN "required" SET DEFAULT false;

ALTER TABLE "lead_document_checklist" 
  ALTER COLUMN "is_submitted" TYPE boolean 
  USING (
    CASE 
      WHEN "is_submitted"::text = 'true' THEN true 
      WHEN "is_submitted"::text = 'false' THEN false 
      ELSE "is_submitted"::text::boolean 
    END
  );

ALTER TABLE "lead_document_checklist" ALTER COLUMN "is_submitted" SET DEFAULT false;

-- notifications
ALTER TABLE "notifications" 
  ALTER COLUMN "read" TYPE boolean 
  USING (
    CASE 
      WHEN "read"::text = 'true' THEN true 
      WHEN "read"::text = 'false' THEN false 
      ELSE "read"::text::boolean 
    END
  );

ALTER TABLE "notifications" ALTER COLUMN "read" SET DEFAULT false;

-- 2. Normalize Role Casing (Idempotent)
UPDATE "users" 
SET "global_role" = 'SUPER_ADMIN' 
WHERE LOWER("global_role") = 'super_admin';

UPDATE "tenant_members" 
SET "role" = 'ADMIN' 
WHERE LOWER("role") = 'admin';

UPDATE "tenant_members" 
SET "role" = 'PRO' 
WHERE LOWER("role") = 'pro';

UPDATE "invitations" 
SET "role" = 'ADMIN' 
WHERE LOWER("role") = 'admin';

UPDATE "invitations" 
SET "role" = 'PRO' 
WHERE LOWER("role") = 'pro';

UPDATE "role_requests" 
SET "requested_role" = 'ADMIN' 
WHERE LOWER("requested_role") = 'admin';

UPDATE "role_requests" 
SET "requested_role" = 'PRO' 
WHERE LOWER("requested_role") = 'pro';

-- 3. Cleanup: Ensure no rogue values exist (detection query only, as per rule 2)
-- These queries will return empty sets in a clean DB.
-- SELECT * FROM tenant_members WHERE role NOT IN ('ADMIN', 'PRO');
-- SELECT * FROM users WHERE global_role IS NOT NULL AND global_role != 'SUPER_ADMIN';
