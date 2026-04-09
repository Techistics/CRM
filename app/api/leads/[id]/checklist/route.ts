import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'

import { getChecklistTemplateForCountry } from '@/constants/documents'
import { db } from '@/db'
import { leadDocumentChecklist, leadActivities } from '@/db/schema'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { requireTenantMemberApi } from '@/lib/tenant-api'

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

  const existing = await db
    .select()
    .from(leadDocumentChecklist)
    .where(
      and(
        eq(leadDocumentChecklist.tenantId, ctx.tenant.id),
        eq(leadDocumentChecklist.leadId, id),
      ),
    )

  if (existing.length > 0) return NextResponse.json({ items: existing })

  const template = getChecklistTemplateForCountry(lead.country)
  const seeded = await db
    .insert(leadDocumentChecklist)
    .values(
      template.map((doc) => ({
        tenantId: ctx.tenant.id,
        leadId: id,
        country: lead.country ?? 'India',
        documentKey: doc.key,
        documentLabel: doc.label,
        required: doc.required ? 'true' : 'false',
        updatedBy: ctx.dbUserId,
      })),
    )
    .returning()

  return NextResponse.json({ items: seeded })
}

export async function PATCH(
  req: NextRequest,
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

  const { itemId, isSubmitted } = await req.json()
  if (!itemId) {
    return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
  }

  const [updated] = await db
    .update(leadDocumentChecklist)
    .set({
      isSubmitted: isSubmitted ? 'true' : 'false',
      submittedAt: isSubmitted ? new Date() : null,
      updatedBy: ctx.dbUserId,
      verifiedBy: isSubmitted ? ctx.dbUserId : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(leadDocumentChecklist.id, String(itemId)),
        eq(leadDocumentChecklist.tenantId, ctx.tenant.id),
        eq(leadDocumentChecklist.leadId, id),
      ),
    )
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 })
  }

  await db.insert(leadActivities).values({
    tenantId: ctx.tenant.id,
    leadId: id,
    userId: ctx.dbUserId,
    type: 'document',
    note: `${updated.documentLabel} marked as ${isSubmitted ? 'submitted' : 'pending'}`,
  })

  return NextResponse.json({ item: updated })
}
