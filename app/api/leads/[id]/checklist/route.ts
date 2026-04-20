import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { DEFAULT_LEAD_COUNTRY } from '@/constants/lead-defaults'
import { getChecklistTemplateForCountry } from '@/constants/documents'
import { db } from '@/db'
import { leadDocumentChecklist, leadActivities } from '@/db/schema'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { requireTenantMemberApi } from '@/lib/tenant-api'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const checklistPatchSchema = z.object({
  itemId: z.string().uuid(),
  isSubmitted: z.boolean(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
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
      return errorResponse('Lead not found', 'NOT_FOUND', 404)
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

    if (existing.length > 0) return successResponse({ items: existing })

    const template = getChecklistTemplateForCountry(lead.country)
    const seeded = await db
      .insert(leadDocumentChecklist)
      .values(
        template.map((doc) => ({
          tenantId: ctx.tenant.id,
          leadId: id,
          country: lead.country ?? DEFAULT_LEAD_COUNTRY,
          documentKey: doc.key,
          documentLabel: doc.label,
          required: !!doc.required,
          updatedBy: ctx.dbUserId,
        })),
      )
      .returning()

    return successResponse({ items: seeded })
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
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
      return errorResponse('Lead not found', 'NOT_FOUND', 404)
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = checklistPatchSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
    }

    const { itemId, isSubmitted } = parsed.data

    const [updated] = await db
      .update(leadDocumentChecklist)
      .set({
        isSubmitted,
        submittedAt: isSubmitted ? new Date() : null,
        updatedBy: ctx.dbUserId,
        verifiedBy: isSubmitted ? ctx.dbUserId : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(leadDocumentChecklist.id, itemId),
          eq(leadDocumentChecklist.tenantId, ctx.tenant.id),
          eq(leadDocumentChecklist.leadId, id),
        ),
      )
      .returning()

    if (!updated) {
      return errorResponse('Checklist item not found', 'NOT_FOUND', 404)
    }

    await db.insert(leadActivities).values({
      tenantId: ctx.tenant.id,
      leadId: id,
      userId: ctx.dbUserId,
      type: 'document',
      note: `${updated.documentLabel} marked as ${isSubmitted ? 'submitted' : 'pending'}`,
    })

    return successResponse({ item: updated })
  })
}
