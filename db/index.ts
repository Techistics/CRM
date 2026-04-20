import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Check your .env.local file.')
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const db = drizzle(pool, { schema })