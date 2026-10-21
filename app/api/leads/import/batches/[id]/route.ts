import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { csvImports } from '@/db/schema'
import { errorResponse, successResponse, withApiErrorHandling } from '@/lib/api-response'
import { requirePermissionApi } from '@/lib/tenant-api'

const patchSchema = z.object({
  campaignName: z.string().trim().min(1).max(100),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('import.leads')
    if (!ctx.ok) return ctx.response

    const { id } = await params
    const body = await req.json().catch(() => null)
    if (!body) {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? 'Validation failed',
        'VALIDATION_ERROR',
        400,
      )
    }

    const [batch] = await db
      .update(csvImports)
      .set({ campaignName: parsed.data.campaignName })
      .where(and(eq(csvImports.id, id), eq(csvImports.tenantId, ctx.tenant.id)))
      .returning({ id: csvImports.id, campaignName: csvImports.campaignName })

    if (!batch) {
      return errorResponse('Import batch not found', 'NOT_FOUND', 404)
    }

    return successResponse({ batch })
  })
}
