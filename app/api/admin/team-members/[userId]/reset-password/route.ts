import { NextResponse } from 'next/server'
import { eq, and, sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '@/db'
import { users, tenantMembers, tenants } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { sendAdminPasswordResetEmail } from '@/lib/mail'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params
    const { newPassword } = await req.json()

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Ensure the caller is an Admin for this tenant
    const [callerMembership] = await db
      .select({ role: tenantMembers.role })
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.userId, session.userId),
          eq(tenantMembers.tenantId, session.tenantId)
        )
      )
      .limit(1)

    if (!callerMembership || callerMembership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get the target user and their membership in this tenant
    const targetUserPromise = db.select().from(users).where(eq(users.id, userId)).limit(1)
    const targetMembershipPromise = db
      .select({ role: tenantMembers.role })
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.userId, userId),
          eq(tenantMembers.tenantId, session.tenantId)
        )
      )
      .limit(1)
      
    const tenantPromise = db.select().from(tenants).where(eq(tenants.id, session.tenantId)).limit(1)

    const [[targetUser], [targetMembership], [tenant]] = await Promise.all([
      targetUserPromise,
      targetMembershipPromise,
      tenantPromise
    ])

    if (!targetUser || !targetMembership || !tenant) {
      return NextResponse.json({ error: 'User or membership not found' }, { status: 404 })
    }

    // Hash the new password
    const hashed = await bcrypt.hash(newPassword, 12)

    // Update the global user password so they can log in
    await db
      .update(users)
      .set({
        password: hashed,
        credentialVersion: sql`${users.credentialVersion} + 1`,
      })
      .where(eq(users.id, userId))

    // Also invalidate existing sessions for this workspace
    await db
      .update(tenantMembers)
      .set({
        credentialVersion: sql`${tenantMembers.credentialVersion} + 1`,
      })
      .where(
        and(
          eq(tenantMembers.userId, userId),
          eq(tenantMembers.tenantId, session.tenantId)
        )
      )

    // Send email notification
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'
    const loginUrl = `${baseUrl}/t/${tenant.slug}`

    const emailResult = await sendAdminPasswordResetEmail({
      email: targetUser.email,
      newPassword,
      workspaceName: tenant.name,
      loginUrl,
    })

    if (!emailResult.success) {
      // We don't fail the password change if the email fails, but we could warn
      console.error('Failed to send reset email', emailResult.error)
      return NextResponse.json({ error: 'Password updated, but failed to send email.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Admin password reset error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
