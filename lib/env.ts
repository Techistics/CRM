import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  CLOUDFLARE_R2_ACCOUNT_ID: z.string().min(1),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().min(1),
  CLOUDFLARE_R2_PUBLIC_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:5000'),
  RESEND_API_KEY: z.string().min(1).optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TOTP_ENCRYPTION_KEY: z.string().length(64).regex(/^[0-9a-fA-F]+$/, 'Must be a 64-char hex string (32 bytes)'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors)
  throw new Error('Invalid environment variables')
}

export const env = parsed.data
