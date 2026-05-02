import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAdminSession } from '@/lib/tenant-server'
import { uploadFile } from '@/lib/storage'

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB for logos

export async function POST(req: NextRequest) {
  try {
    const { tenant } = await requireTenantAdminSession()
    
    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
        { status: 400 }
      )
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 100)
    const key = `crm/${tenant.id}/branding/${Date.now()}-${safeName}`

    const buffer = await file.arrayBuffer()
    const result = await uploadFile(
      Buffer.from(buffer),
      key,
      file.type || 'application/octet-stream'
    )

    return NextResponse.json({ url: result.url })
  } catch (error: unknown) {
    console.error('Logo upload failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
