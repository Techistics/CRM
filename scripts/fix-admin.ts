import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function main() {
  // First delete any existing record with wrong ID
  await db.delete(schema.users)

  // Insert with the EXACT id from Clerk token logs
  await db.insert(schema.users).values({
    clerkId: 'user_3B5k5pEIvibuQR934nVqUf1c8Ai',
    email: 'lodhihasnain70@gmail.com',
    name: 'Hassnain Lodhi',
    role: 'admin',
  })

  // Verify it's there
  const all = await db.select().from(schema.users)
  console.log('Users in DB:', JSON.stringify(all, null, 2))

  process.exit(0)
}

main()