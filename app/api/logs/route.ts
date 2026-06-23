import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTenantMemberApi } from '@/lib/tenant-api'
import { db } from '@/db'
import { consultantLogs, users, leads } from '@/db/schema'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { toMemberScope } from '@/lib/member-scope'

const postBodySchema = z.object({
  leadId: z.string().uuid(),
  type: z.enum(['note', 'call', 'message']).optional().default('note'),
  body: z.string().min(1).max(10_000),
})

export async function POST(req: Request) {
  try {
    const ctx = await requireTenantMemberApi()
    if (!ctx.ok) return ctx.response

    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = postBodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    const { leadId, type, body } = parsed.data

    const lead = await getLeadForMemberAction(
      leadId,
      ctx.tenant.id,
      toMemberScope(ctx),
    )
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const [insertedLog] = await db
      .insert(consultantLogs)
      .values({
        tenantId: ctx.tenant.id,
        leadId,
        userId: ctx.dbUserId,
        type,
        body,
      })
      .returning()

    return NextResponse.json(insertedLog, { status: 201 })
  } catch (error: unknown) {
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
    const groupByLead = searchParams.get('groupByLead') === 'true'

    const filters = [eq(consultantLogs.tenantId, ctx.tenant.id)]

    if (leadId) filters.push(eq(consultantLogs.leadId, leadId))
    if (userId) filters.push(eq(consultantLogs.userId, userId))
    if (from) filters.push(gte(consultantLogs.createdAt, new Date(from)))
    if (to) {
      const toDate = new Date(to)
      toDate.setHours(23, 59, 59, 999)
      filters.push(lte(consultantLogs.createdAt, toDate))
    }

    if (groupByLead) {
          // Use raw SQL with subquery to get latest log per lead
          const logs = await db.execute(sql`
            SELECT *
            FROM (
              SELECT
                cl.lead_id AS "leadId",
                l.full_name AS "leadFullName",
                l.primary_stage AS "leadStage",
                cl.body AS "latestLogBody",
                cl.created_at AS "latestLogCreatedAt",
                cl.type AS "type",
                ROW_NUMBER() OVER (PARTITION BY cl.lead_id ORDER BY cl.created_at DESC) AS rn
              FROM consultant_logs cl
              JOIN leads l ON cl.lead_id = l.id
              WHERE cl.tenant_id = ${ctx.tenant.id}
              ${leadId ? sql` AND cl.lead_id = ${leadId}` : sql``}
              ${userId ? sql` AND cl.user_id = ${userId}` : sql``}
              ${from ? sql` AND cl.created_at >= ${new Date(from)}` : sql``}
              ${to ? sql` AND cl.created_at <= ${new Date(to)}` : sql``}
            ) ranked
            WHERE rn = 1
          `);
          return NextResponse.json(logs.rows);
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
        leadStage: leads.primaryStage,
      })
      .from(consultantLogs)
      .leftJoin(users, eq(consultantLogs.userId, users.id))
      .leftJoin(leads, eq(consultantLogs.leadId, leads.id))
      .where(and(...filters))
      .orderBy(desc(consultantLogs.createdAt))

    return NextResponse.json(logs)
  } catch (error: unknown) {
    console.error('Error fetching logs:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
