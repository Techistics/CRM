import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function main() {
  console.log('Creating lead_co_assignments table...');
  await db.execute(`
    CREATE TABLE IF NOT EXISTS "lead_co_assignments" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
      "lead_id" uuid NOT NULL UNIQUE REFERENCES "leads"("id") ON DELETE CASCADE,
      "assigned_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "assigned_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "trigger_stage_key" varchar(64),
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS "idx_lead_co_assignments_lead" ON "lead_co_assignments" ("lead_id")`);
  await db.execute(`CREATE INDEX IF NOT EXISTS "idx_lead_co_assignments_tenant" ON "lead_co_assignments" ("tenant_id")`);
  await db.execute(`CREATE INDEX IF NOT EXISTS "idx_lead_co_assignments_user" ON "lead_co_assignments" ("assigned_user_id")`);
  console.log('Done! lead_co_assignments table created.');
}

main().catch(console.error);
