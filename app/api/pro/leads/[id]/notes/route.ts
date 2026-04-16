import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { leadActivities } from '@/db/schema'
import { requireTenantMemberApi } from '@/lib/tenant-api'
import { getLeadForMemberAction } from '@/lib/lead-tenant'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTenantMemberApi()
  if (!ctx.ok) return ctx.response

  const { id } = await params
  const { note, type } = await req.json()
  if (!note?.trim()) {
    return NextResponse.json({ error: 'Note is empty' }, { status: 400 })
  }

  const lead = await getLeadForMemberAction(
    id,
    ctx.tenant.id,
    ctx.role,
    ctx.dbUserId,
  )
  if (!lead) {
    return NextResponse.json({ error: 'Not your lead' }, { status: 403 })
  }

  await db.insert(leadActivities).values({
    tenantId: ctx.tenant.id,
    leadId: id,
    userId: ctx.dbUserId,
    type: type ?? 'note',
    note: note.trim(),
  })

  return NextResponse.json({ success: true })
}
