import { NextRequest } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { leads } from '@/db/schema'
import { errorResponse, successResponse, withApiErrorHandling } from '@/lib/api-response'
import { requirePermissionApi } from '@/lib/tenant-api'

const bodySchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(100),
  tenantSlug: z.string().min(1),
})

export async function DELETE(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('leads.delete')
    if (!ctx.ok) return ctx.response

    const body = await req.json().catch(() => null)
    if (!body) return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)

    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
    if (parsed.data.tenantSlug !== ctx.tenant.slug) return errorResponse('Forbidden', 'FORBIDDEN', 403)

    const deleted = await db
      .delete(leads)
      .where(and(eq(leads.tenantId, ctx.tenant.id), inArray(leads.id, parsed.data.leadIds)))
      .returning({ id: leads.id })

    return successResponse({ deleted: deleted.length })
  })
}
