import { NextRequest } from 'next/server'
import { and, count, eq, isNull, or } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { followUpTemplates } from '@/db/schema'
import { requireTenantAdminApi, requireTenantMemberApi } from '@/lib/tenant-api'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const createSchema = z.object({
  tenantSlug: z.string().min(1),
  name: z.string().min(1).max(100),
  stage: z.string().max(50).optional().nullable(),
  message: z.string().min(1).max(2000),
})

const querySchema = z.object({
  tenantSlug: z.string().min(1),
  stage: z.string().max(50).optional(),
})

const DEFAULT_TEMPLATES: Array<{
  name: string
  stage: string | null
  message: string
}> = [
  {
    stage: 'new_lead',
    name: 'Initial enquiry response',
    message:
      "Assalam o Alaikum {name}! Thank you for your interest in studying abroad. I'd love to help you with your journey to {country}. Could we schedule a quick call to discuss your goals?",
  },
  {
    stage: 'follow_up',
    name: 'Follow-up after no response',
    message:
      'Hi {name}, I wanted to follow up on your study abroad enquiry. We have excellent options for {programme} in {country}. Are you still interested? I’m here to help!',
  },
  {
    stage: 'docs_received',
    name: 'Documents received confirmation',
    message:
      "Hi {name}, I've received your documents. Our team is reviewing them and will get back to you within 2-3 working days with your options. Thank you for your patience!",
  },
  {
    stage: 'options_sent',
    name: 'Following up on sent options',
    message:
      "Hi {name}, I sent you the university options yesterday. Have you had a chance to review them? I'd love to hear your thoughts and answer any questions you might have.",
  },
  {
    stage: null,
    name: 'General check-in',
    message:
      'Hi {name}, just checking in on your application. Is there anything I can help you with today?',
  },
]

async function seedIfEmpty(tenantId: string) {
  const [row] = await db
    .select({ c: count(followUpTemplates.id) })
    .from(followUpTemplates)
    .where(eq(followUpTemplates.tenantId, tenantId))

  const existing = Number(row?.c ?? 0)
  if (existing > 0) return

  await db.insert(followUpTemplates).values(
    DEFAULT_TEMPLATES.map((t) => ({
      tenantId,
      name: t.name,
      stage: t.stage,
      message: t.message,
      createdBy: null,
      createdAt: new Date(),
    })),
  )
}

export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantMemberApi()
    if (!ctx.ok) return ctx.response

    const url = new URL(req.url)
    const parsed = querySchema.safeParse({
      tenantSlug: url.searchParams.get('tenantSlug'),
      stage: url.searchParams.get('stage') ?? undefined,
    })
    if (!parsed.success) {
      return errorResponse('Invalid query', 'VALIDATION_ERROR', 400)
    }

    if (parsed.data.tenantSlug !== ctx.tenant.slug) {
      return errorResponse('Invalid workspace context', 'TENANT_MISMATCH', 403)
    }

    await seedIfEmpty(ctx.tenant.id)

    const stage = parsed.data.stage?.trim()
    const where = stage
      ? and(
          eq(followUpTemplates.tenantId, ctx.tenant.id),
          or(eq(followUpTemplates.stage, stage), isNull(followUpTemplates.stage))!,
        )
      : eq(followUpTemplates.tenantId, ctx.tenant.id)

    const templates = await db
      .select()
      .from(followUpTemplates)
      .where(where)

    return successResponse({ templates })
  })
}

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    const body = await req.json().catch(() => null)
    if (!body) {
      return errorResponse('Invalid JSON body', 'INVALID_JSON', 400)
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? 'Validation failed', 'VALIDATION_ERROR', 400)
    }

    if (parsed.data.tenantSlug !== ctx.tenant.slug) {
      return errorResponse('Invalid workspace context', 'TENANT_MISMATCH', 403)
    }

    const [created] = await db
      .insert(followUpTemplates)
      .values({
        tenantId: ctx.tenant.id,
        name: parsed.data.name.trim(),
        stage: parsed.data.stage?.trim() || null,
        message: parsed.data.message.trim(),
        createdBy: ctx.dbUserId,
        createdAt: new Date(),
      })
      .returning()

    return successResponse({ template: created }, 201)
  })
}

