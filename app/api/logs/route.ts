import { NextResponse } from 'next/server'
import { requireTenantMemberApi } from '@/lib/tenant-api'
import { db } from '@/db'
import { consultantLogs, users, leads } from '@/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'

export async function POST(req: Request) {
  try {
    const ctx = await requireTenantMemberApi()
    if (!ctx.ok) return ctx.response

    const { leadId, type = 'note', body } = await req.json()

    if (!leadId || !body) {
      return NextResponse.json({ error: 'leadId and body are required' }, { status: 400 })
    }

    if (!['note', 'call', 'message'].includes(type)) {
      return NextResponse.json({ error: 'invalid type' }, { status: 400 })
    }

    const [insertedLog] = await db
      .insert(consultantLogs)
      .values({
        tenantId: ctx.tenant.id,
        leadId,
        userId: ctx.dbUserId,
        type: type as 'note' | 'call' | 'message',
        body,
      })
      .returning()

    return NextResponse.json(insertedLog, { status: 201 })
  } catch (error: any) {
    console.error('Error creating log:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const ctx = await requireTenantMemberApi()
    if (!ctx.ok) return ctx.response

    const { searchParams } = new URL(req.url)
    const leadId = searchParams.get('leadId')
    const userId = searchParams.get('userId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const filters = [eq(consultantLogs.tenantId, ctx.tenant.id)]

    if (leadId) {
      filters.push(eq(consultantLogs.leadId, leadId))
    }
    if (userId) {
      filters.push(eq(consultantLogs.userId, userId))
    }
    if (from) {
      filters.push(gte(consultantLogs.createdAt, new Date(from)))
    }
    if (to) {
  const toDate = new Date(to)
  toDate.setHours(23, 59, 59, 999)
  filters.push(lte(consultantLogs.createdAt, toDate))
}

    const logs = await db
      .select({
        id: consultantLogs.id,
        type: consultantLogs.type,
        body: consultantLogs.body,
        createdAt: consultantLogs.createdAt,
        userId: consultantLogs.userId,
        userName: users.name,
        leadId: consultantLogs.leadId,
        leadFullName: leads.fullName,
      })
      .from(consultantLogs)
      .leftJoin(users, eq(consultantLogs.userId, users.id))
      .leftJoin(leads, eq(consultantLogs.leadId, leads.id))
      .where(and(...filters))
      .orderBy(desc(consultantLogs.createdAt))

    return NextResponse.json(logs)
  } catch (error: any) {
    console.error('Error fetching logs:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
