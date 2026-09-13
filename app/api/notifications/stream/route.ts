import { NextRequest, NextResponse } from 'next/server'
import { desc, and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { notifications } from '@/db/schema'
import { requireTenantMemberApi } from '@/lib/tenant-api'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const ctx = await requireTenantMemberApi()
  if (!ctx.ok) return ctx.response

  try {
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
  } catch (err) {
    console.error('[Notifications GET Error]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
