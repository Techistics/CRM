import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function main() {
  const usersToSync = [
    {
      email: 'hasnainlodhi005@gmail.com',
      name: 'Hassnain',
      role: 'agent' as const,
    },
    // When you create a new user, add them here:
    // {
    //   email: 'agent@gmail.com',
    //   name: 'Agent Name',
    //   role: 'agent' as const,
    // },
  ]

  for (const user of usersToSync) {
    await db
      .insert(schema.users)
      .values({
        email: user.email,
        name: user.name,
        role: user.role,
        // Using a placeholder password for synced users
        password: 'change-me-sync',
      })
      .onConflictDoUpdate({
        target: schema.users.email,
        set: {
          name: user.name,
          role: user.role,
        },
      })
    console.log(`✓ Synced: ${user.email} (${user.role})`)
  }

  process.exit(0)
}

main()