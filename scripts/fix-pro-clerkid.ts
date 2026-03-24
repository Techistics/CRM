import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../db/schema'
const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function main() {
  const all = await db.select().from(schema.users)
  console.log('All users in DB:')
  console.log(JSON.stringify(all, null, 2))
  process.exit(0)
}

main()