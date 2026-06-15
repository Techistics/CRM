import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tenantTimesheets } from '@/db/schema'
import { and, eq, isNull, lt } from 'drizzle-orm'
import { requireTenantSession } from '@/lib/tenant-server'

export async function GET() {
  try {
    const { tenant, dbUserId } = await requireTenantSession()

    // Auto punch-out stale sessions (no heartbeat for 2 minutes)
    const staleThreshold = new Date(Date.now() - 2 * 60 * 1000)
    const staleSessions = await db
      .select()
      .from(tenantTimesheets)
      .where(and(
        eq(tenantTimesheets.tenantId, tenant.id),
        eq(tenantTimesheets.userId, dbUserId),
        isNull(tenantTimesheets.punchOut),
        lt(tenantTimesheets.lastHeartbeat, staleThreshold)
      ))

    for (const s of staleSessions) {
      const punchOut = s.lastHeartbeat ?? new Date()
      const totalMinutes = Math.round(
        (punchOut.getTime() - new Date(s.punchIn).getTime()) / 60000
      )
      await db.update(tenantTimesheets)
        .set({ punchOut, totalMinutes })
        .where(eq(tenantTimesheets.id, s.id))
    }

    const [activeSession] = await db
      .select()
      .from(tenantTimesheets)
      .where(and(
        eq(tenantTimesheets.tenantId, tenant.id),
        eq(tenantTimesheets.userId, dbUserId),
        isNull(tenantTimesheets.punchOut)
      ))

    return NextResponse.json({ activeSession: activeSession ?? null })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}