import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { tenantMembers } from '@/db/schema'
import { and } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { getSession } from '@/lib/auth'

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
    if (!user || !user.password)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid)
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

    const hashed = await bcrypt.hash(newPassword, 12)

// If session is tenant-scoped, update tenantMembers.tenantPassword
if (session.tenantId) {
  await db
    .update(tenantMembers)
    .set({ tenantPassword: hashed })
    .where(and(eq(tenantMembers.userId, session.userId), eq(tenantMembers.tenantId, session.tenantId)))
} else {
  // SUPER_ADMIN — update global password
  await db.update(users).set({ password: hashed }).where(eq(users.id, session.userId))
}

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}