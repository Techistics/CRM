import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { leadActivities, leadDocumentChecklist, leadReminders, leads } from '@/db/schema'
import { getLeadForMemberAction, getLeadInTenant } from '@/lib/lead-tenant'
import { requireTenantAdminApi, requireTenantMemberApi } from '@/lib/tenant-api'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTenantMemberApi()
  if (!ctx.ok) return ctx.response

  const { id } = await params
  const lead = await getLeadForMemberAction(
    id,
    ctx.tenant.id,
    ctx.role,
    ctx.dbUserId,
  )
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  return NextResponse.json({ lead })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTenantAdminApi()
  if (!ctx.ok) return ctx.response

  const { id } = await params
  const lead = await getLeadInTenant(id, ctx.tenant.id)
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const body = await req.json()
  const updates = {
    fullName: body?.fullName ? String(body.fullName).trim() : lead.fullName,
    email: body?.email ? String(body.email).trim().toLowerCase() : null,
    contactNumber: body?.contactNumber ? String(body.contactNumber).trim() : null,
    city: body?.city ? String(body.city).trim() : null,
    country: body?.country ? String(body.country).trim() : 'India',
    lastQualification: body?.lastQualification
      ? String(body.lastQualification).trim()
      : null,
    grades: body?.grades ? String(body.grades).trim() : null,
    updatedAt: new Date(),
  }

  const [updated] = await db
    .update(leads)
    .set(updates)
    .where(and(eq(leads.id, id), eq(leads.tenantId, ctx.tenant.id)))
    .returning()

  return NextResponse.json({ lead: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTenantAdminApi()
  if (!ctx.ok) return ctx.response

  const { id } = await params
  const lead = await getLeadInTenant(id, ctx.tenant.id)
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  await db.delete(leadActivities).where(
    and(eq(leadActivities.tenantId, ctx.tenant.id), eq(leadActivities.leadId, id)),
  )
  await db.delete(leadDocumentChecklist).where(
    and(
      eq(leadDocumentChecklist.tenantId, ctx.tenant.id),
      eq(leadDocumentChecklist.leadId, id),
    ),
  )
  await db.delete(leadReminders).where(
    and(eq(leadReminders.tenantId, ctx.tenant.id), eq(leadReminders.leadId, id)),
  )
  await db.delete(leads).where(and(eq(leads.id, id), eq(leads.tenantId, ctx.tenant.id)))

  return NextResponse.json({ success: true })
}
