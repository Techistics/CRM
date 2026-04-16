import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { leadActivities, leadUploadedDocuments, users } from '@/db/schema'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { requireTenantMemberApi } from '@/lib/tenant-api'

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB

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
        eq(leadUploadedDocuments.tenantId, ctx.tenant.id),
        eq(leadUploadedDocuments.leadId, id),
      ),
    )
    .orderBy(desc(leadUploadedDocuments.createdAt))

  return NextResponse.json({ documents: rows })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTenantMemberApi()
  if (!ctx.ok) return ctx.response

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return NextResponse.json(
      {
        error:
          'File storage is not configured. Add BLOB_READ_WRITE_TOKEN for Vercel Blob, or use another provider.',
      },
      { status: 503 },
    )
  }

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

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 400 },
    )
  }

  const labelRaw = formData.get('label')
  const label =
    typeof labelRaw === 'string' && labelRaw.trim() ? labelRaw.trim() : null

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180)
  const pathname = `crm/${ctx.tenant.id}/leads/${id}/${Date.now()}-${safeName}`

  const blob = await put(pathname, file, {
    access: 'public',
    token,
    addRandomSuffix: true,
  })

  const [row] = await db
    .insert(leadUploadedDocuments)
    .values({
      tenantId: ctx.tenant.id,
      leadId: id,
      fileName: file.name,
      mimeType: file.type || null,
      sizeBytes: file.size,
      storageUrl: blob.url,
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

  return NextResponse.json({ document: row }, { status: 201 })
}
