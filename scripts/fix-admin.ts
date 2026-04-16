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

  await db.insert(schema.users).values({
    email,
    name: 'Hassnain Lodhi',
    role: 'super_admin',
    password: 'change-me-admin',
  }).onConflictDoUpdate({
    target: schema.users.email,
    set: {
      role: 'super_admin',
    }
  })

  // Verify it's there
  const user = await db.select().from(schema.users).where(eq(schema.users.email, email))
  console.log('User in DB:', JSON.stringify(user, null, 2))

  process.exit(0)
}

main()