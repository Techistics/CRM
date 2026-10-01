import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { pipelineSubStatuses } from '@/db/schema'
import { requirePermissionApi } from '@/lib/tenant-api'
import { DEFAULT_SUB_STATUSES } from '@/constants/sub-status-defaults'

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermissionApi('pipelines.manage')
    if (!ctx.ok) return ctx.response
    const { tenant } = ctx

    // Check if already seeded
    const existing = await db
      .select({ id: pipelineSubStatuses.id })
      .from(pipelineSubStatuses)
      .where(eq(pipelineSubStatuses.tenantId, tenant.id))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json({ skipped: true })
    }

    // Flatten and bulk insert
    const rows: typeof pipelineSubStatuses.$inferInsert[] = []
    for (const [stageKey, subStatuses] of Object.entries(DEFAULT_SUB_STATUSES)) {
      subStatuses.forEach((ss, index) => {
        rows.push({
          tenantId: tenant.id,
          stageKey,
          label: ss.label,
          type: ss.type,
          closedActions: ss.closedActions,
          sortOrder: index,
        })
      })
    }

    await db.insert(pipelineSubStatuses).values(rows)

    return NextResponse.json({ seeded: rows.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}