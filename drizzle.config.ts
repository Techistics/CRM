import { defineConfig } from 'drizzle-kit'
import * as dotenv from 'dotenv'
import { neonConfig } from '@neondatabase/serverless'

dotenv.config({ path: '.env.local' })

// drizzle-kit runs in Node; provide WebSocket implementation for Neon driver.
// Avoids adding TypeScript types just for config.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ws: any = require('ws')
neonConfig.webSocketConstructor = ws

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})