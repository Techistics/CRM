import { NextRequest } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { tenantMembers } from '@/db/schema'
import { requireTenantAdminApi } from '@/lib/tenant-api'
import { sendInviteEmail } from '@/lib/mail'
import { createInvitationAndSendEmail } from '@/lib/invitations/service'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'PRO']),
  name: z.string().optional(),
})

export async function POST(
  req: NextRequest
) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    const body = await req.json().catch(() => null)
    if (!body) return errorResponse('Invalid JSON', 'INVALID_JSON', 400)

    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)

    const { email, role } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

    // 1. Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, normalizedEmail),
    })

    if (existingUser) {
      // Check if already a member of THIS tenant
      const member = await db.query.tenantMembers.findFirst({
        where: (tm, { and, eq }) =>
          and(eq(tm.tenantId, ctx.tenant.id), eq(tm.userId, existingUser.id)),
      })

      if (member) {
        return errorResponse('User is already a member of this workspace', 'ALREADY_MEMBER', 409)
      }

      // User exists but not in this tenant -> Add them directly
      await db.insert(tenantMembers).values({
        tenantId: ctx.tenant.id,
        userId: existingUser.id,
        role,
      })

      // Send notification email
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
        await sendInviteEmail({
          email: normalizedEmail,
          tenantName: ctx.tenant.name,
          inviteLink: `${baseUrl}/?highlight=${ctx.tenant.slug}`, 
        })
      } catch (err) {
        console.error('[invite] Direct add email failed:', err)
      }

      return successResponse({ added: true }, 200)
    }

    // 2. User does not exist -> Create invitation
    const result = await createInvitationAndSendEmail({
      tenantId: ctx.tenant.id,
      tenantSlug: ctx.tenant.slug,
      tenantName: ctx.tenant.name,
      email: normalizedEmail,
      role,
      invitedBy: ctx.dbUserId,
    })

    return successResponse(
      {
        invited: true,
        invitationId: result.invitationId,
        emailSent: result.emailSent,
      },
      201,
    )
  })
}
