-- Final Boolean Normalization Migration
-- Ensures columns are strictly boolean and handles legacy string data ('true'/'false')

DO $$ 
BEGIN
    -- 1. Fix lead_document_checklist.required
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_document_checklist' AND column_name = 'required' AND data_type = 'text') THEN
        ALTER TABLE lead_document_checklist ALTER COLUMN required SET DATA TYPE boolean USING (required = 'true');
    END IF;
    ALTER TABLE lead_document_checklist ALTER COLUMN required SET DEFAULT false;

    -- 2. Fix lead_document_checklist.is_submitted
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_document_checklist' AND column_name = 'is_submitted' AND data_type = 'text') THEN
        ALTER TABLE lead_document_checklist ALTER COLUMN is_submitted SET DATA TYPE boolean USING (is_submitted = 'true');
    END IF;
    ALTER TABLE lead_document_checklist ALTER COLUMN is_submitted SET DEFAULT false;

    -- 3. Fix notifications.read
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read' AND data_type = 'text') THEN
        ALTER TABLE notifications ALTER COLUMN "read" SET DATA TYPE boolean USING ("read" = 'true');
    END IF;
    ALTER TABLE notifications ALTER COLUMN "read" SET DEFAULT false;

END $$;

-- Role Normalization (UPPERCASE only, no auto-assignment of invalid values)
UPDATE "users" SET "global_role" = 'SUPER_ADMIN' WHERE LOWER("global_role") = 'super_admin';
UPDATE "tenant_members" SET "role" = 'ADMIN' WHERE LOWER("role") = 'admin';
UPDATE "tenant_members" SET "role" = 'PRO' WHERE LOWER("role") = 'pro';
UPDATE "invitations" SET "role" = 'ADMIN' WHERE LOWER("role") = 'admin';
UPDATE "invitations" SET "role" = 'PRO' WHERE LOWER("role") = 'pro';
UPDATE "role_requests" SET "requested_role" = 'ADMIN' WHERE LOWER("requested_role") = 'admin';
UPDATE "role_requests" SET "requested_role" = 'PRO' WHERE LOWER("requested_role") = 'pro';
