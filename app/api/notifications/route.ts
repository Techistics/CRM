import { NextResponse } from 'next/server'
import { desc, and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { notifications } from '@/db/schema'
import { requireTenantMemberApi } from '@/lib/tenant-api'

export async function GET() {
  const ctx = await requireTenantMemberApi()
  if (!ctx.ok) return ctx.response

  const userNotifs = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.tenantId, ctx.tenant.id),
        eq(notifications.userId, ctx.dbUserId),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(20)

  return NextResponse.json({ notifications: userNotifs })
}
