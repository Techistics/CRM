import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { leadActivities, leadUploadedDocuments } from '@/db/schema'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { requireTenantMemberApi } from '@/lib/tenant-api'
import { deleteFile, getStorageConfig } from '@/lib/storage'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantMemberApi()
    if (!ctx.ok) return ctx.response

    const { id, docId } = await params
    const lead = await getLeadForMemberAction(
      id,
      ctx.tenant.id,
      ctx.role,
      ctx.dbUserId,
    )
    if (!lead) {
      return errorResponse('Lead not found or access denied', 'NOT_FOUND', 404)
    }

    const doc = await db.query.leadUploadedDocuments.findFirst({
      where: and(
        eq(leadUploadedDocuments.id, docId),
        eq(leadUploadedDocuments.tenantId, ctx.tenant.id),
        eq(leadUploadedDocuments.leadId, id),
      ),
    })

    if (!doc) {
      return errorResponse('Document not found', 'NOT_FOUND', 404)
    }

    // Extract key from URL
    const config = getStorageConfig()
    const baseUrl = config.publicUrl.replace(/\/$/, '') + '/'
    const key = doc.storageUrl.replace(baseUrl, '')

    try {
      await deleteFile(key)
    } catch (err) {
      console.error('File deletion failed from storage:', err)
      // We continue to delete from DB even if cloud delete fails to keep DB clean, 
      // or we could throw error. Generally better to ensure consistency.
    }

    await db
      .delete(leadUploadedDocuments)
      .where(eq(leadUploadedDocuments.id, docId))

    await db.insert(leadActivities).values({
      tenantId: ctx.tenant.id,
      leadId: id,
      userId: ctx.dbUserId,
      type: 'document',
      note: `Deleted document: ${doc.fileName}${doc.label ? ` (${doc.label})` : ''}`,
    })

    return successResponse({ deleted: true })
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantMemberApi()
    if (!ctx.ok) return ctx.response

    const { id, docId } = await params
    const lead = await getLeadForMemberAction(
      id,
      ctx.tenant.id,
      ctx.role,
      ctx.dbUserId,
    )
    if (!lead) {
      return errorResponse('Lead not found or access denied', 'NOT_FOUND', 404)
    }

    const { label } = await req.json()
    if (typeof label !== 'string') {
      return errorResponse('Invalid label', 'INVALID_INPUT', 400)
    }

    const [updated] = await db
      .update(leadUploadedDocuments)
      .set({ label: label.trim() || null })
      .where(
        and(
          eq(leadUploadedDocuments.id, docId),
          eq(leadUploadedDocuments.tenantId, ctx.tenant.id),
          eq(leadUploadedDocuments.leadId, id),
        ),
      )
      .returning()

    if (!updated) {
      return errorResponse('Document not found', 'NOT_FOUND', 404)
    }

    await db.insert(leadActivities).values({
      tenantId: ctx.tenant.id,
      leadId: id,
      userId: ctx.dbUserId,
      type: 'document',
      note: `Renamed document label to: ${label || 'None'}`,
    })

    return successResponse({ document: updated })
  })
}
