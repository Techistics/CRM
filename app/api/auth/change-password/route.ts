import { NextResponse } from 'next/server'
import { eq, and, sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { tenantMembers } from '@/db/schema'
import { db } from '@/db'
import { users } from '@/db/schema'
import { getSession, logout } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword)
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })

    if (newPassword.length < 8)
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })

    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const hashed = await bcrypt.hash(newPassword, 12)

    if (session.tenantId) {
      const [membership] = await db
        .select({ tenantPassword: tenantMembers.tenantPassword, credentialVersion: tenantMembers.credentialVersion })
        .from(tenantMembers)
        .where(
          and(
            eq(tenantMembers.userId, session.userId),
            eq(tenantMembers.tenantId, session.tenantId),
          ),
        )
        .limit(1)

      if (!membership) {
        return NextResponse.json({ error: 'Workspace membership not found' }, { status: 404 })
      }

      const passwordToCheck = membership.tenantPassword ?? user.password
      if (!passwordToCheck) {
        return NextResponse.json({ error: 'No password set for this workspace' }, { status: 400 })
      }

      const valid = await bcrypt.compare(currentPassword, passwordToCheck)
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }

      await db
        .update(tenantMembers)
        .set({
          tenantPassword: hashed,
          credentialVersion: sql`${tenantMembers.credentialVersion} + 1`,
        })
        .where(
          and(
            eq(tenantMembers.userId, session.userId),
            eq(tenantMembers.tenantId, session.tenantId),
          ),
        )
    } else {
      if (!user.password) {
        return NextResponse.json({ error: 'No password set' }, { status: 400 })
      }

      const valid = await bcrypt.compare(currentPassword, user.password)
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }

      await db
        .update(users)
        .set({
          password: hashed,
          credentialVersion: sql`${users.credentialVersion} + 1`,
        })
        .where(eq(users.id, session.userId))
    }

    await logout()

    return NextResponse.json({ success: true, requiresReLogin: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
