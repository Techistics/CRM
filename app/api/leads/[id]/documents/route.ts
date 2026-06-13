import { NextRequest } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { leadActivities, leadUploadedDocuments, users } from '@/db/schema'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { requireLeadEditApi, requireLeadViewApi } from '@/lib/tenant-api'
import { uploadFile } from '@/lib/storage'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireLeadViewApi()
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

    const rows = await db
      .select({
        id: leadUploadedDocuments.id,
        fileName: leadUploadedDocuments.fileName,
        mimeType: leadUploadedDocuments.mimeType,
        sizeBytes: leadUploadedDocuments.sizeBytes,
        storageUrl: leadUploadedDocuments.storageUrl,
        label: leadUploadedDocuments.label,
        createdAt: leadUploadedDocuments.createdAt,
        uploaderName: users.name,
      })
      .from(leadUploadedDocuments)
      .leftJoin(users, eq(leadUploadedDocuments.uploadedBy, users.id))
      .where(
        and(
          eq(leadUploadedDocuments.tenantId, lead.tenantId),
          eq(leadUploadedDocuments.leadId, id),
        ),
      )
      .orderBy(desc(leadUploadedDocuments.createdAt))

    return successResponse({ documents: rows })
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireLeadEditApi()
    if (!ctx.ok) return ctx.response

    // Env is validated at startup in lib/env.ts, so we don't need manual check here 
    // but we can log if something is weird.

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

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return errorResponse('Expected multipart form data', 'INVALID_FORM_DATA', 400)
    }

    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return errorResponse('file is required', 'MISSING_FILE', 400)
    }
    if (file.size > MAX_BYTES) {
      return errorResponse(`File too large (max ${MAX_BYTES / 1024 / 1024} MB)`, 'FILE_TOO_LARGE', 400)
    }

    const labelRaw = formData.get('label')
    const label =
      typeof labelRaw === 'string' && labelRaw.trim() ? labelRaw.trim() : null

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180)
    const key = `crm/${ctx.tenant.id}/leads/${id}/${Date.now()}-${safeName}`

    let storageUrl: string
    try {
      const buffer = await file.arrayBuffer()
      const result = await uploadFile(
        Buffer.from(buffer),
        key,
        file.type || 'application/octet-stream',
      )
      storageUrl = result.url
    } catch (err) {
      console.error('File upload failed:', err)
      return errorResponse('File upload failed. Check storage configuration.', 'STORAGE_ERROR', 503)
    }

    const [row] = await db
      .insert(leadUploadedDocuments)
      .values({
        tenantId: ctx.tenant.id,
        leadId: id,
        fileName: file.name,
        mimeType: file.type || null,
        sizeBytes: file.size,
        storageUrl,
        label,
        uploadedBy: ctx.dbUserId,
      })
      .returning()

    await db.insert(leadActivities).values({
      tenantId: ctx.tenant.id,
      leadId: id,
      userId: ctx.dbUserId,
      type: 'document',
      note: `Uploaded file: ${file.name}${label ? ` (${label})` : ''}`,
    })

    return successResponse({ document: row }, 201)
  })
}
