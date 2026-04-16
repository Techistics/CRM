'use server'

import { db } from '@/db'
import { users, passwordResetTokens } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

type State = { error: string; success: string }

export async function forgotPasswordAction(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!email) {
    return { error: 'Email is required.', success: '' }
  }

  const [existingUser] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.email, email))

  // If user doesn't exist, we don't return an error for security
  if (!existingUser) {
    return { error: '', success: 'Check your email for a reset link.' }
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

  await db.insert(passwordResetTokens).values({
    userId: existingUser.id,
    token,
    expiresAt,
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const resetUrl = `${appUrl}/reset-password?token=${token}`

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'noreply@devclyst.syedbilal.site',
    to: email,
    subject: 'Reset your password',
    html: `
      <p>Hi ${existingUser.name},</p>
      <p>You requested a password reset. Click the button below to set a new password:</p>
      <p>
        <a href="${resetUrl}" style="background:#000;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
          Reset password
        </a>
      </p>
      <p>This link will expire in 1 hour.</p>
    `,
  })

  return { error: '', success: 'Check your email for a reset link.' }
}
