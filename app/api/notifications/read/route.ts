import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'

import { db } from '@/db'
import { notifications } from '@/db/schema'
import { requireTenantMemberApi } from '@/lib/tenant-api'

export async function POST(req: NextRequest) {
  const ctx = await requireTenantMemberApi()
  if (!ctx.ok) return ctx.response

  const { notificationId } = await req.json()

  if (notificationId === 'all') {
    await db
      .update(notifications)
      .set({ read: 'true' })
      .where(
        and(
          eq(notifications.userId, ctx.dbUserId),
          eq(notifications.tenantId, ctx.tenant.id),
        ),
      )
  } else {
    await db
      .update(notifications)
      .set({ read: 'true' })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, ctx.dbUserId),
          eq(notifications.tenantId, ctx.tenant.id),
        ),
      )
  }

  return NextResponse.json({ success: true })
}
