import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'

import { isValidLeadStage } from '@/constants/pipeline-stages'
import { db } from '@/db'
import { leads, leadActivities } from '@/db/schema'
import { requireTenantMemberApi } from '@/lib/tenant-api'
import { getLeadForMemberAction } from '@/lib/lead-tenant'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTenantMemberApi()
  if (!ctx.ok) return ctx.response

  const { id } = await params
  const { stage } = await req.json()
  if (!isValidLeadStage(stage)) {
    return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
  }

  const lead = await getLeadForMemberAction(
    id,
    ctx.tenant.id,
    ctx.role,
    ctx.dbUserId,
  )
  if (!lead) {
    return NextResponse.json(
      { error: 'Lead not found or not assigned to you' },
      { status: 404 },
    )
  }

  if (lead.stage === stage) {
    return NextResponse.json({ success: true, unchanged: true })
  }

  await db
    .update(leads)
    .set({ stage, updatedAt: new Date() })
    .where(and(eq(leads.id, id), eq(leads.tenantId, ctx.tenant.id)))

  await db.insert(leadActivities).values({
    tenantId: ctx.tenant.id,
    leadId: id,
    userId: ctx.dbUserId,
    type: 'stage_change',
    fromStage: lead.stage,
    toStage: stage,
  })

  return NextResponse.json({ success: true })
}
