import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { csvImports } from '@/db/schema'
import { requirePermissionApi } from '@/lib/tenant-api'
import { withApiErrorHandling, successResponse } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('leads.view')
    if (!ctx.ok) return ctx.response

    // Return distinct campaign names set during CSV import (not raw source values)
    const rows = await db
      .selectDistinct({ campaignName: csvImports.campaignName })
      .from(csvImports)
      .where(eq(csvImports.tenantId, ctx.tenant.id))

    const uniqueSources = new Map<string, string>()
    rows.forEach((r) => {
      if (r.campaignName) {
        const trimmed = r.campaignName.trim()
        const key = trimmed.toLowerCase()
        if (!uniqueSources.has(key)) {
          uniqueSources.set(key, trimmed)
        }
      }
    })

    const sources = Array.from(uniqueSources.values())

    return successResponse({ sources })
  })
}
