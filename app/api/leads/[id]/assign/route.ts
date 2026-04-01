import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { leads, notifications, tenantMembers } from '@/db/schema'
import { requireTenantAdminApi } from '@/lib/tenant-api'
import { getLeadInTenant } from '@/lib/lead-tenant'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTenantAdminApi()
  if (!ctx.ok) return ctx.response

  const { id } = await params
  const { assignedTo } = await req.json()

  const lead = await getLeadInTenant(id, ctx.tenant.id)
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  if (assignedTo) {
    const [member] = await db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, ctx.tenant.id),
          eq(tenantMembers.userId, assignedTo),
        ),
      )
      .limit(1)
    if (!member) {
      return NextResponse.json(
        { error: 'Assignee is not in this workspace' },
        { status: 400 },
      )
    }
  }

  await db
    .update(leads)
    .set({ assignedTo: assignedTo || null, updatedAt: new Date() })
    .where(and(eq(leads.id, id), eq(leads.tenantId, ctx.tenant.id)))

  if (assignedTo) {
    await db.insert(notifications).values({
      tenantId: ctx.tenant.id,
      userId: assignedTo,
      title: 'New lead assigned',
      body: `${lead.fullName} has been assigned to you`,
      type: 'lead_assigned',
      leadId: id,
    })
  }

  return NextResponse.json({ success: true })
}
