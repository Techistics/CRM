import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'

import { DEFAULT_LEAD_COUNTRY } from '@/constants/lead-defaults'
import { db } from '@/db'
import {
  leadActivities,
  leadDocumentChecklist,
  leadReminders,
  leadUploadedDocuments,
  leads,
} from '@/db/schema'
import { getLeadForMemberAction, getLeadInTenant } from '@/lib/lead-tenant'
import { requireTenantAdminApi, requireTenantMemberApi } from '@/lib/tenant-api'
import { leadPatchBodySchema } from '@/lib/validators/lead'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

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

    return successResponse({ lead })
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    const { id } = await params
    const lead = await getLeadInTenant(id, ctx.tenant.id)
    if (!lead) {
      return errorResponse('Lead not found', 'NOT_FOUND', 404)
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = leadPatchBodySchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
    }

    const patch = parsed.data

    function strOrNull(v: unknown): string | null {
      if (v == null) return null
      const s = String(v).trim()
      return s === '' ? null : s
    }

    const nextCountryRaw =
      patch.country !== undefined ? String(patch.country).trim() : undefined
    const nextCountry =
      nextCountryRaw === undefined
        ? (lead.country ?? DEFAULT_LEAD_COUNTRY)
        : nextCountryRaw === ''
          ? DEFAULT_LEAD_COUNTRY
          : nextCountryRaw

    if (patch.fullName !== undefined) {
      const nextName = String(patch.fullName).trim()
      if (!nextName) {
        return errorResponse('fullName cannot be empty', 'VALIDATION_ERROR', 400)
      }
    }

    const updates = {
      fullName:
        patch.fullName !== undefined
          ? String(patch.fullName).trim()
          : lead.fullName,
      email:
        patch.email !== undefined
          ? patch.email === '' || patch.email === null
            ? null
            : patch.email.toLowerCase().trim()
          : lead.email,
      contactNumber:
        patch.contactNumber !== undefined
          ? strOrNull(patch.contactNumber)
          : lead.contactNumber,
      city: patch.city !== undefined ? strOrNull(patch.city) : lead.city,
      country: nextCountry,
      lastQualification:
        patch.lastQualification !== undefined
          ? strOrNull(patch.lastQualification)
          : lead.lastQualification,
      grades: patch.grades !== undefined ? strOrNull(patch.grades) : lead.grades,
      updatedAt: new Date(),
    }

    if (
      nextCountryRaw !== undefined &&
      (lead.country ?? DEFAULT_LEAD_COUNTRY) !== nextCountry
    ) {
      await db.delete(leadDocumentChecklist).where(
        and(
          eq(leadDocumentChecklist.tenantId, ctx.tenant.id),
          eq(leadDocumentChecklist.leadId, id),
        ),
      )
    }

    const [updated] = await db
      .update(leads)
      .set(updates)
      .where(and(eq(leads.id, id), eq(leads.tenantId, ctx.tenant.id)))
      .returning()

    const changed: string[] = []
    if (patch.fullName !== undefined && updates.fullName !== lead.fullName)
      changed.push('name')
    if (patch.email !== undefined && updates.email !== lead.email) changed.push('email')
    if (patch.contactNumber !== undefined) changed.push('phone')
    if (patch.city !== undefined) changed.push('city')
    if (patch.country !== undefined) changed.push('country')
    if (patch.lastQualification !== undefined) changed.push('qualification')
    if (patch.grades !== undefined) changed.push('grades')

    if (changed.length > 0) {
      await db.insert(leadActivities).values({
        tenantId: ctx.tenant.id,
        leadId: id,
        userId: ctx.dbUserId,
        type: 'note',
        note: `Lead details updated (${changed.join(', ')})`,
      })
    }

    return successResponse({ lead: updated })
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    const { id } = await params
    const lead = await getLeadInTenant(id, ctx.tenant.id)
    if (!lead) {
      return errorResponse('Lead not found', 'NOT_FOUND', 404)
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
    await db.delete(leadUploadedDocuments).where(
      and(
        eq(leadUploadedDocuments.tenantId, ctx.tenant.id),
        eq(leadUploadedDocuments.leadId, id),
      ),
    )
    await db.delete(leadReminders).where(
      and(eq(leadReminders.tenantId, ctx.tenant.id), eq(leadReminders.leadId, id)),
    )
    await db.delete(leads).where(and(eq(leads.id, id), eq(leads.tenantId, ctx.tenant.id)))

    return successResponse({ ok: true })
  })
}
