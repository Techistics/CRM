import { NextRequest } from 'next/server'
import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/db'
import { leads } from '@/db/schema'
import { requirePermissionApi } from '@/lib/tenant-api'
import { withApiErrorHandling, successResponse } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('leads.view')
    if (!ctx.ok) return ctx.response

    const rows = await db
      .selectDistinct({ intakeMonth: leads.intakeMonth })
      .from(leads)
      .where(and(eq(leads.tenantId, ctx.tenant.id), isNotNull(leads.intakeMonth)))

    const intakeMonths = rows
      .map((r) => r.intakeMonth)
      .filter((v): v is string => Boolean(v))
      .sort()

    return successResponse({ intakeMonths })
  })
}
