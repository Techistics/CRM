import { NextRequest, NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { leadTagAssignments, leadTags, leads, users } from '@/db/schema'
import { errorResponse, withApiErrorHandling } from '@/lib/api-response'
import { leadsVisibleWhere } from '@/lib/leads-scope'
import { requirePermissionApi } from '@/lib/tenant-api'

const bodySchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(500),
  tenantSlug: z.string().min(1),
})

function sanitizeCsvCell(value: unknown): string {
  const text = value == null ? '' : String(value)
  if (/^[=+\-@]/.test(text)) return `'${text}`
  return text.replace(/"/g, '""')
}

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('leads.view')
    if (!ctx.ok) return ctx.response

    const body = await req.json().catch(() => null)
    if (!body) return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)
    if (parsed.data.tenantSlug !== ctx.tenant.slug) return errorResponse('Forbidden', 'FORBIDDEN', 403)

    const rows = await db
      .select({
        id: leads.id,
        fullName: leads.fullName,
        email: leads.email,
        contactNumber: leads.contactNumber,
        city: leads.city,
        country: leads.country,
        stage: leads.stage,
        source: leads.source,
        assigneeName: users.name,
        dealValue: leads.dealValue,
        dealCurrency: leads.dealCurrency,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .leftJoin(users, eq(users.id, leads.assignedTo))
      .where(
        and(
          leadsVisibleWhere(ctx.tenant.id, ctx.role, ctx.dbUserId),
          inArray(leads.id, parsed.data.leadIds),
        ),
      )

    const tags = await db
      .select({
        leadId: leadTagAssignments.leadId,
        tagName: leadTags.name,
      })
      .from(leadTagAssignments)
      .innerJoin(leadTags, eq(leadTags.id, leadTagAssignments.tagId))
      .where(inArray(leadTagAssignments.leadId, rows.map((row) => row.id)))
    const tagsByLead = new Map<string, string[]>()
    tags.forEach((item) => {
      const list = tagsByLead.get(item.leadId) ?? []
      list.push(item.tagName)
      tagsByLead.set(item.leadId, list)
    })

    const header = [
      'Name',
      'Email',
      'Contact',
      'City',
      'Country',
      'Stage',
      'Source',
      'Assigned To',
      'Deal Value',
      'Currency',
      'Tags',
      'Created At',
    ]
    const lines = [header.join(',')]
    rows.forEach((row) => {
      const values = [
        row.fullName,
        row.email,
        row.contactNumber,
        row.city,
        row.country,
        row.stage,
        row.source,
        row.assigneeName ?? 'Unassigned',
        row.dealValue,
        row.dealCurrency,
        (tagsByLead.get(row.id) ?? []).join('; '),
        row.createdAt?.toISOString() ?? '',
      ].map((value) => `"${sanitizeCsvCell(value)}"`)
      lines.push(values.join(','))
    })

    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="leads-export.csv"',
      },
    })
  })
}
