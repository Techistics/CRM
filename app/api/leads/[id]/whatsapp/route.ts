import { NextRequest } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { leadActivities, leadWhatsappLogs, leads, users } from '@/db/schema'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'
import { requireTenantMemberApi } from '@/lib/tenant-api'

const createSchema = z.object({
  direction: z.enum(['sent', 'received']),
  message: z.string().min(1).max(1000),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantMemberApi()
    if (!ctx.ok) return ctx.response

    const { id } = await params
    const lead = await getLeadForMemberAction(id, ctx.tenant.id, ctx.role, ctx.dbUserId)
    if (!lead) {
      return errorResponse('Lead not found', 'NOT_FOUND', 404)
    }

    const logs = await db
      .select({
        id: leadWhatsappLogs.id,
        leadId: leadWhatsappLogs.leadId,
        tenantId: leadWhatsappLogs.tenantId,
        userId: leadWhatsappLogs.userId,
        userName: users.name,
        direction: leadWhatsappLogs.direction,
        message: leadWhatsappLogs.message,
        createdAt: leadWhatsappLogs.createdAt,
      })
      .from(leadWhatsappLogs)
      .innerJoin(users, eq(users.id, leadWhatsappLogs.userId))
      .where(
        and(eq(leadWhatsappLogs.tenantId, ctx.tenant.id), eq(leadWhatsappLogs.leadId, id)),
      )
      .orderBy(desc(leadWhatsappLogs.createdAt))

    return successResponse({ logs })
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantMemberApi()
    if (!ctx.ok) return ctx.response

    const { id } = await params
    const lead = await getLeadForMemberAction(id, ctx.tenant.id, ctx.role, ctx.dbUserId)
    if (!lead) {
      return errorResponse('Lead not found', 'NOT_FOUND', 404)
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? 'Validation failed', 'VALIDATION_ERROR', 400)
    }

    const message = parsed.data.message.trim()
    if (!message) {
      return errorResponse('Message is required', 'VALIDATION_ERROR', 400)
    }

    const [created] = await db
      .insert(leadWhatsappLogs)
      .values({
        tenantId: ctx.tenant.id,
        leadId: id,
        userId: ctx.dbUserId,
        direction: parsed.data.direction,
        message,
        createdAt: new Date(),
      })
      .returning()

    await db
      .update(leads)
      .set({ lastContactedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(leads.id, id), eq(leads.tenantId, ctx.tenant.id)))

    await db.insert(leadActivities).values({
      tenantId: ctx.tenant.id,
      leadId: id,
      userId: ctx.dbUserId,
      type: 'whatsapp',
      note: message.substring(0, 50),
    })

    const [createdWithUser] = await db
      .select({
        id: leadWhatsappLogs.id,
        leadId: leadWhatsappLogs.leadId,
        tenantId: leadWhatsappLogs.tenantId,
        userId: leadWhatsappLogs.userId,
        userName: users.name,
        direction: leadWhatsappLogs.direction,
        message: leadWhatsappLogs.message,
        createdAt: leadWhatsappLogs.createdAt,
      })
      .from(leadWhatsappLogs)
      .innerJoin(users, eq(users.id, leadWhatsappLogs.userId))
      .where(
        and(eq(leadWhatsappLogs.tenantId, ctx.tenant.id), eq(leadWhatsappLogs.id, created.id)),
      )
      .limit(1)

    return successResponse({ log: createdWithUser ?? created }, 201)
  })
}

