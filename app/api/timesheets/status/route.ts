import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tenantTimesheets } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { requireTenantSession } from '@/lib/tenant-server'

export async function GET() {
  try {
    const { tenant, dbUserId } = await requireTenantSession()

    const [activeSession] = await db
      .select()
      .from(tenantTimesheets)
      .where(
        and(
          eq(tenantTimesheets.tenantId, tenant.id),
          eq(tenantTimesheets.userId, dbUserId),
          isNull(tenantTimesheets.punchOut)
        )
      )

    return NextResponse.json({ activeSession: activeSession || null })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch status' },
      { status: 500 }
    )
  }
}
