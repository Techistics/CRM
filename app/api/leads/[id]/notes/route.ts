import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { leadActivities } from '@/db/schema'
import { requireTenantAdminApi } from '@/lib/tenant-api'
import { getLeadInTenant } from '@/lib/lead-tenant'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTenantAdminApi()
  if (!ctx.ok) return ctx.response

  const { id } = await params
  const { note, type } = await req.json()
  if (!note?.trim()) {
    return NextResponse.json({ error: 'Note is empty' }, { status: 400 })
  }

  const lead = await getLeadInTenant(id, ctx.tenant.id)
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
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
