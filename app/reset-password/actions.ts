'use server'

import { db } from '@/db'
import { users, passwordResetTokens } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

type State = { error: string; success: string }

export async function resetPasswordAction(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const token = formData.get('token') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!token) return { error: 'Invalid token.', success: '' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.', success: '' }
  if (password !== confirmPassword) return { error: 'Passwords do not match.', success: '' }

  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))

  if (!resetToken || new Date() > new Date(resetToken.expiresAt)) {
    return { error: 'Token is invalid or has expired.', success: '' }
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, resetToken.userId))

  // Clean up ALL tokens for this user
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, resetToken.userId))

  return { error: '', success: 'Password has been reset successfully! You can now sign in.' }
}
