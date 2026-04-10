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
      clerkId: 'user_3B7CPFOydNlupdSa2bWAiQC7NWe', // your admin ID
      email: 'hasnainlodhi005@gmail.com',
      name: 'Hassnain',
      role: 'pro' as const,
    },
    // When you create a pro user in Clerk, add them here:
    // {
    //   clerkId: 'user_xxx',
    //   email: 'agent@gmail.com',
    //   name: 'Agent Name',
    //   role: 'pro' as const,
    // },
  ]

  for (const user of usersToSync) {
    await db
      .insert(schema.users)
      .values(user)
      .onConflictDoUpdate({
        target: schema.users.clerkId,
        set: {
          email: user.email,
          name: user.name,
          role: user.role,
        },
      })
    console.log(`✓ Synced: ${user.email} (${user.role})`)
  }

  process.exit(0)
}

main()