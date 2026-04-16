import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../db/schema'
import { eq } from 'drizzle-orm'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function main() {
  const email = 'lodhihasnain70@gmail.com'
  
  // Update role using email as the lookup key
  await db
    .update(schema.users)
    .set({ role: 'super_admin' })
    .where(eq(schema.users.email, email))

  const user = await db.select().from(schema.users).where(eq(schema.users.email, email))
  console.log('Updated user:', JSON.stringify(user, null, 2))
  process.exit(0)
}

main()