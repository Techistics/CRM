import { sql } from 'drizzle-orm'
import { db } from '@/db'

/**
 * Executes a database callback within a secure transaction that enforces Row-Level Security (RLS).
 * It automatically injects the tenant ID into the Postgres session variables, guaranteeing
 * that the database itself will prevent any queries from leaking data from other tenants.
 */
export async function withTenantRls<T>(
  tenantId: string,
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    // Set the tenant ID for the current transaction session
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)
    
    // Execute the actual database logic (RLS policies will now enforce this tenant ID)
    // We cast `tx` to `typeof db` so we can seamlessly pass it around in place of the standard db object
    return callback(tx as any)
  })
}
