import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'

import { db } from '@/db'
import { leadActivities, leadUploadedDocuments, users } from '@/db/schema'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { requireTenantMemberApi } from '@/lib/tenant-api'
import { uploadFile } from '@/lib/storage'

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

  if (!process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
    return NextResponse.json(
      {
        error:
          'File storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL.',
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
  const key = `crm/${ctx.tenant.id}/leads/${id}/${Date.now()}-${safeName}`

  let storageUrl: string
  try {
    const buffer = await file.arrayBuffer()
    storageUrl = await uploadFile(buffer, key, file.type || 'application/octet-stream')
  } catch (err) {
    console.error('File upload failed:', err)
    return NextResponse.json(
      { error: 'File upload failed. Check storage configuration.' },
      { status: 503 },
    )
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

  return NextResponse.json({ document: row }, { status: 201 })
}
