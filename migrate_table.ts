import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function main() {
  console.log('Creating table...');
  await db.execute(`
    CREATE TABLE IF NOT EXISTS counselor_diaries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      diary_date date NOT NULL,
      start_time varchar(5) NOT NULL,
      end_time varchar(5) NOT NULL,
      content text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_counselor_diaries_tenant ON counselor_diaries(tenant_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_counselor_diaries_user ON counselor_diaries(user_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_counselor_diaries_date ON counselor_diaries(diary_date);`);
  console.log('Table and indexes created!');
}

main().catch(console.error);
