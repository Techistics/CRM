import { defineConfig } from 'drizzle-kit'
import * as dotenv from 'dotenv'
import { neonConfig } from '@neondatabase/serverless'

dotenv.config({ path: '.env.local' })

import ws from 'ws'
neonConfig.webSocketConstructor = ws

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})