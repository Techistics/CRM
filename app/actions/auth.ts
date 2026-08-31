'use server'

import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users, tenantMembers } from '@/db/schema'
import { nanoid } from 'nanoid'
import { sendPasswordResetEmail } from '@/lib/mail'
import bcrypt from 'bcryptjs'

/**
 * Generates a reset token, saves it to the user, and sends an email.
 */
export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.toLowerCase().trim()

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1)

  // For security, don't reveal if user exists or not
  if (!user) {
    return { success: true }
  }

  // Check if user is only a PRO across all their workspaces
  const memberships = await db
    .select({ role: tenantMembers.role })
    .from(tenantMembers)
    .where(eq(tenantMembers.userId, user.id))
    
  const isOnlyPro = memberships.length > 0 && memberships.every(m => m.role === 'PRO')
  
  if (isOnlyPro) {
    // Abort silently to prevent email enumeration
    return { success: true }
  }

  const token = nanoid(32)
  const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db
    .update(users)
    .set({
      resetToken: token,
      resetTokenExpiry: expiry,
    })
    .where(eq(users.id, user.id))

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'
  const resetLink = `${baseUrl}/reset-password?token=${token}`
  
  const emailResult = await sendPasswordResetEmail({
    email: normalizedEmail,
    resetLink,
  })

  if (!emailResult.success) {
    console.error('Failed to send password reset email:', emailResult.error)
    throw new Error('Failed to send reset email. Please try again later.')
  }

  return { success: true }
}

/**
 * Validates the token and updates the user's password.
 */
export async function resetPassword(token: string, newPassword: string) {
  if (!token || !newPassword) {
    throw new Error('Missing token or password')
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.resetToken, token))
    .limit(1)

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    throw new Error('Invalid or expired reset token')
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)

  await db
    .update(users)
    .set({
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    })
    .where(eq(users.id, user.id))

  return { success: true }
}
