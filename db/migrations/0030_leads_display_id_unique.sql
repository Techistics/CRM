-- Unique index on (tenant_id, display_id) for leads.
--
-- IMPORTANT: Run the duplicate-check query first (see below). If it returns
-- any rows, resolve the duplicates before applying this migration, otherwise
-- the CREATE UNIQUE INDEX statement will fail.
--
-- ── Duplicate-check query (READ ONLY – do not run the migration yet) ──────────
--
--   SELECT tenant_id, display_id, COUNT(*) AS cnt
--   FROM   leads
--   WHERE  display_id IS NOT NULL
--   GROUP  BY tenant_id, display_id
--   HAVING COUNT(*) > 1
--   ORDER  BY cnt DESC;
--
-- If the query returns zero rows it is safe to apply this migration.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS "unq_leads_tenant_display_id"
  ON "leads" ("tenant_id", "display_id")
  WHERE "display_id" IS NOT NULL;
