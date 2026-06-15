import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tenantTimesheets } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { requireTenantSession } from '@/lib/tenant-server'

export async function POST() {
  try {
    const { tenant, dbUserId } = await requireTenantSession()
    
    await db
      .update(tenantTimesheets)
      .set({ lastHeartbeat: new Date() })
      .where(and(
        eq(tenantTimesheets.tenantId, tenant.id),
        eq(tenantTimesheets.userId, dbUserId),
        isNull(tenantTimesheets.punchOut)
      ))

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}