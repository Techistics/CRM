require('dotenv').config({ path: '.env' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    console.log("Connected to DB via Neon Serverless");

    await sql(`
      CREATE TABLE IF NOT EXISTS consultant_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        lead_id uuid NOT NULL,
        user_id uuid,
        type text NOT NULL DEFAULT 'note',
        body text NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT fk_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    await sql(`
      CREATE INDEX IF NOT EXISTS idx_consultant_logs_tenant ON consultant_logs (tenant_id);
    `);
    
    await sql(`
      CREATE INDEX IF NOT EXISTS idx_consultant_logs_lead ON consultant_logs (lead_id);
    `);
    
    await sql(`
      CREATE INDEX IF NOT EXISTS idx_consultant_logs_user ON consultant_logs (user_id);
    `);

    console.log("Table and indexes created successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

run();
