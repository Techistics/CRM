import { NextRequest, NextResponse } from 'next/server'
import { eq, and, asc } from 'drizzle-orm'
import { db } from '@/db'
import { pipelineSubStatuses } from '@/db/schema'
import { requireTenantSession } from '@/lib/tenant-server'

export async function GET(req: NextRequest) {
  try {
    const { tenant } = await requireTenantSession()
    const { searchParams } = new URL(req.url)
    const stageKey = searchParams.get('stageKey')

    const conditions = [eq(pipelineSubStatuses.tenantId, tenant.id)]
    if (stageKey) conditions.push(eq(pipelineSubStatuses.stageKey, stageKey))

    const rows = await db
      .select({
        id: pipelineSubStatuses.id,
        stageKey: pipelineSubStatuses.stageKey,
        label: pipelineSubStatuses.label,
        type: pipelineSubStatuses.type,
        closedActions: pipelineSubStatuses.closedActions,
        sortOrder: pipelineSubStatuses.sortOrder,
      })
      .from(pipelineSubStatuses)
      .where(and(...conditions))
      .orderBy(asc(pipelineSubStatuses.sortOrder))

    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenant, role } = await requireTenantSession()
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { stageKey, label, type, closedActions, sortOrder } = body

    if (!stageKey || !label || !type) {
      return NextResponse.json({ error: 'stageKey, label, type required' }, { status: 400 })
    }

    const [row] = await db.insert(pipelineSubStatuses).values({
      tenantId: tenant.id,
      stageKey,
      label,
      type,
      closedActions: closedActions ?? [],
      sortOrder: sortOrder ?? 0,
    }).returning()

    return NextResponse.json({ data: row }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { tenant, role } = await requireTenantSession()
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { id, label, type, closedActions, sortOrder } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const [updated] = await db
      .update(pipelineSubStatuses)
      .set({
        ...(label !== undefined && { label }),
        ...(type !== undefined && { type }),
        ...(closedActions !== undefined && { closedActions }),
        ...(sortOrder !== undefined && { sortOrder }),
      })
      .where(and(
        eq(pipelineSubStatuses.id, id),
        eq(pipelineSubStatuses.tenantId, tenant.id)
      ))
      .returning()

    return NextResponse.json({ data: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { tenant, role } = await requireTenantSession()
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await db.delete(pipelineSubStatuses)
      .where(and(
        eq(pipelineSubStatuses.id, id),
        eq(pipelineSubStatuses.tenantId, tenant.id)
      ))

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}