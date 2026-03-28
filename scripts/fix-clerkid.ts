import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../db/schema'
import { eq } from 'drizzle-orm'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function main() {
  // Update clerkId using email as the lookup key
  await db
    .update(schema.users)
    .set({ clerkId: 'user_3B5k5pEIvibuQR934nVqUf1c8Ai' })
    .where(eq(schema.users.email, 'lodhihasnain70@gmail.com'))

  const all = await db.select().from(schema.users)
  console.log('Updated user:', JSON.stringify(all, null, 2))
  process.exit(0)
}

main()