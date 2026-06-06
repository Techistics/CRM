import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tenantTimesheets } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { requireTenantSession } from '@/lib/tenant-server'

export async function POST() {
  try {
    const { tenant, dbUserId } = await requireTenantSession()

    // Check for an active session
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

    if (activeSession) {
      return NextResponse.json(
        { error: 'Already punched in' },
        { status: 400 }
      )
    }

    // Insert new row
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD

    await db.insert(tenantTimesheets).values({
      tenantId: tenant.id,
      userId: dbUserId,
      punchIn: now,
      date: dateStr,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to punch in' },
      { status: 500 }
    )
  }
}
