import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export const teamInviteSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  role: z.enum(['ADMIN', 'PRO'])
})

export const teamResendSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  role: z.enum(['ADMIN', 'PRO']).optional()
})

export const roleUpdateSchema = z.object({
  role: z.enum(['ADMIN', 'PRO'])
})
