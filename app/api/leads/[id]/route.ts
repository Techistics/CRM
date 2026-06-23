import { NextRequest } from 'next/server'
import { and, eq, isNull } from 'drizzle-orm'

import { DEFAULT_LEAD_COUNTRY } from '@/constants/lead-defaults'
import { db } from '@/db'
import {
leadActivities,
leadDocumentChecklist,
leadReminders,
leadUploadedDocuments,
leads,
tenantMembers,
notifications,
} from '@/db/schema'
import { getLeadForMemberAction, getLeadInTenant } from '@/lib/lead-tenant'
import { toMemberScope } from '@/lib/member-scope'
import { requirePermissionApi } from '@/lib/tenant-api'
import { leadPatchBodySchema } from '@/lib/validators/lead'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'
import { canEditPayments, stripDealFields } from '@/lib/leads/deal-access'

export async function GET(
_req: NextRequest,
{ params }: { params: Promise<{ id: string }> },
) {
return withApiErrorHandling(async () => {
  const ctx = await requirePermissionApi('leads.view')
  if (!ctx.ok) return ctx.response

  const { id } = await params
  const lead = await getLeadForMemberAction(
    id,
    ctx.tenant.id,
    toMemberScope(ctx),
  )
  if (!lead) {
    return errorResponse('Lead not found', 'NOT_FOUND', 404)
  }

  return successResponse({ lead: stripDealFields(lead, ctx.role, ctx.permissions) })
})
}

export async function PATCH(
req: NextRequest,
{ params }: { params: Promise<{ id: string }> },
) {
return withApiErrorHandling(async () => {
  const ctx = await requirePermissionApi('leads.edit')
  if (!ctx.ok) return ctx.response

  const { id } = await params
  const lead = await getLeadForMemberAction(
    id,
    ctx.tenant.id,
    toMemberScope(ctx),
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

  const parsed = leadPatchBodySchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
  }

  const patch = parsed.data

  if (
    (patch.dealValue !== undefined || patch.dealCurrency !== undefined) &&
    !canEditPayments(ctx.role, ctx.permissions)
  ) {
    return errorResponse('You do not have permission to edit payments', 'FORBIDDEN', 403)
  }

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
    /* NEW – intake & destination fields */
    intakeMonth:
      patch.intakeMonth !== undefined
        ? strOrNull(patch.intakeMonth)
        : lead.intakeMonth,
    destinationCountry:
      patch.destinationCountry !== undefined
        ? strOrNull(patch.destinationCountry)
        : lead.destinationCountry,
    programOfInterest:
      patch.programOfInterest !== undefined
        ? strOrNull(patch.programOfInterest)
        : lead.programOfInterest,
    dealValue:
      patch.dealValue !== undefined
        ? patch.dealValue?.toString() ?? null
        : lead.dealValue,
    dealCurrency: patch.dealCurrency ?? lead.dealCurrency,
    // NEW – dead‑status fields
    isDeadManual:
      patch.isDeadManual !== undefined
        ? Boolean(patch.isDeadManual)
        : lead.isDeadManual,
    deadReason:
      patch.isDeadManual === false
        ? null
        : patch.deadReason !== undefined
          ? (patch.deadReason === '' ? null : String(patch.deadReason).trim())
          : lead.deadReason,
    updatedAt: new Date(),
    subStatusId: patch.subStatusId !== undefined ? patch.subStatusId : lead.subStatusId,
closedAction: patch.closedAction !== undefined ? strOrNull(patch.closedAction) : lead.closedAction,
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

  if (patch.isDeadManual === true) {
    const adminMembers = await db
      .select({ userId: tenantMembers.userId })
      .from(tenantMembers)
      .where(and(
        eq(tenantMembers.tenantId, ctx.tenant.id),
        eq(tenantMembers.role, 'ADMIN'),
        isNull(tenantMembers.deletedAt)
      ))

    const recipients = new Set(adminMembers.map(m => m.userId))
    if (lead.assignedTo) recipients.add(lead.assignedTo)
    recipients.delete(ctx.dbUserId)

    for (const userId of recipients) {
      await db.insert(notifications).values({
        tenantId: ctx.tenant.id,
        userId,
        title: 'Lead marked as dead',
        body: `${lead.fullName} has been marked as dead`,
        type: 'stage_changed',
        leadId: id,
      })
    }
  }

  const changed: string[] = []
  if (patch.fullName !== undefined && updates.fullName !== lead.fullName)
    changed.push('name')
  if (patch.email !== undefined && updates.email !== lead.email) changed.push('email')
  if (patch.contactNumber !== undefined) changed.push('phone')
  if (patch.city !== undefined) changed.push('city')
  if (patch.country !== undefined) changed.push('country')
  if (patch.lastQualification !== undefined) changed.push('qualification')
  if (patch.grades !== undefined) changed.push('grades')
    if (patch.intakeMonth !== undefined) changed.push('intake month')
    if (patch.destinationCountry !== undefined) changed.push('destination country')
    if (patch.programOfInterest !== undefined) changed.push('program of interest')
  if (patch.dealValue !== undefined) changed.push('deal value')
  if (patch.dealCurrency !== undefined) changed.push('currency')
  if (patch.isDeadManual !== undefined) changed.push('dead status')
    if (patch.subStatusId !== undefined) changed.push('sub status')
      if (patch.closedAction !== undefined) changed.push('closed action')

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
  const ctx = await requirePermissionApi('leads.delete')
  if (!ctx.ok) return ctx.response

  const { id } = await params
  const lead = await getLeadForMemberAction(id, ctx.tenant.id, toMemberScope(ctx))
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
