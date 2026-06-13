import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { leadActivities, leads } from '@/db/schema'
import { requireLeadEditApi } from '@/lib/tenant-api'
import { getLeadForMemberAction } from '@/lib/lead-tenant'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const noteSchema = z.object({
  note: z.string().min(1, 'Note content is required'),
  type: z.enum(['stage_change', 'note', 'call', 'message', 'document']).optional().default('note')
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireLeadEditApi()
    if (!ctx.ok) return ctx.response

    const { id } = await params
    
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = noteSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
    }

    const lead = await getLeadForMemberAction(id, ctx.tenant.id, ctx.role, ctx.dbUserId)
    if (!lead) {
      return errorResponse('Lead not found or no access', 'NOT_FOUND', 404)
    }

    const { note, type } = parsed.data

    await db.insert(leadActivities).values({
      tenantId: ctx.tenant.id,
      leadId: id,
      userId: ctx.dbUserId,
      type,
      note: note.trim(),
    })

    await db
      .update(leads)
      .set({ lastContactedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(leads.id, id), eq(leads.tenantId, ctx.tenant.id)))

    return successResponse({ ok: true })
  })
}
