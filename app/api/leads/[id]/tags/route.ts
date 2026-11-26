import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { leadTagAssignments, leadTags, leads } from '@/db/schema'
import { leadIdsInScopeWhere } from '@/lib/leads-scope'
import { toMemberScope } from '@/lib/member-scope'
import { requireLeadEditApi } from '@/lib/tenant-api'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'
import { z } from 'zod'

const assignSchema = z.object({
  tagId: z.string().uuid(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireLeadEditApi()
    if (!ctx.ok) return ctx.response

    const { id: leadId } = await params

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = assignSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
    }

    const { tagId } = parsed.data

    return await db.transaction(async (tx) => {
      // 1. Verify the lead is within the member's editable lead scope
      const [lead] = await tx
        .select({ id: leads.id })
        .from(leads)
        .where(
          leadIdsInScopeWhere(
            ctx.tenant.id,
            [leadId],
            toMemberScope({ ...ctx, permissions: ctx.permissions ?? [] }),
          ),
        )

      if (!lead) return errorResponse('Lead not found', 'NOT_FOUND', 404)

      // 2. Verify tag belongs to tenant
      const [tag] = await tx
        .select({ id: leadTags.id })
        .from(leadTags)
        .where(and(eq(leadTags.id, tagId), eq(leadTags.tenantId, ctx.tenant.id)))

      if (!tag) return errorResponse('Tag not found', 'NOT_FOUND', 404)

      try {
        await tx.insert(leadTagAssignments).values({
          leadId,
          tagId,
        })
        return successResponse({ ok: true }, 201)
      } catch (err) {
        const error = err as { code?: string }
        if (error.code === '23505') { // Already assigned
          return successResponse({ ok: true })
        }
        throw err
      }
    })
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireLeadEditApi()
    if (!ctx.ok) return ctx.response

    const { id: leadId } = await params
    const parsedTagId = assignSchema.shape.tagId.safeParse(req.nextUrl.searchParams.get('tagId'))

    if (!parsedTagId.success) {
      return errorResponse('A valid tagId is required', 'VALIDATION_ERROR', 400)
    }
    const tagId = parsedTagId.data

    return await db.transaction(async (tx) => {
      const [lead] = await tx
        .select({ id: leads.id })
        .from(leads)
        .where(
          leadIdsInScopeWhere(
            ctx.tenant.id,
            [leadId],
            toMemberScope({ ...ctx, permissions: ctx.permissions ?? [] }),
          ),
        )

      if (!lead) return errorResponse('Lead not found', 'NOT_FOUND', 404)

      const [tag] = await tx
        .select({ id: leadTags.id })
        .from(leadTags)
        .where(and(eq(leadTags.id, tagId), eq(leadTags.tenantId, ctx.tenant.id)))

      if (!tag) return errorResponse('Tag not found', 'NOT_FOUND', 404)

      await tx.delete(leadTagAssignments).where(
        and(
          eq(leadTagAssignments.leadId, leadId),
          eq(leadTagAssignments.tagId, tagId),
        ),
      )

      return successResponse({ ok: true })
    })
  })
}
