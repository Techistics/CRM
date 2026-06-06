import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tenantTimesheets } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { requireTenantSession } from '@/lib/tenant-server'

export async function POST() {
  try {
    const { tenant, dbUserId } = await requireTenantSession()

    // Find the active session
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

    if (!activeSession) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 400 }
      )
    }

    const punchOut = new Date()
    const punchIn = new Date(activeSession.punchIn)
    const totalMinutes = Math.round((punchOut.getTime() - punchIn.getTime()) / 60000)

    // Update row
    await db
      .update(tenantTimesheets)
      .set({
        punchOut,
        totalMinutes,
      })
      .where(eq(tenantTimesheets.id, activeSession.id))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to punch out' },
      { status: 500 }
    )
  }
}
