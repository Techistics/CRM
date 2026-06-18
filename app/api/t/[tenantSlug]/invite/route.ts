import { NextRequest } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { requirePermissionApi } from '@/lib/tenant-api'
import { createInvitationAndSendEmail } from '@/lib/invitations/service'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'
import { validateCustomRoleId } from '@/lib/validate-custom-role'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'PRO']),
  name: z.string().optional(),
  customRoleId: z.string().uuid().nullable().optional(),
})

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requirePermissionApi('teams.manage')
    if (!ctx.ok) return ctx.response

    const body = await req.json().catch(() => null)
    if (!body) return errorResponse('Invalid JSON', 'INVALID_JSON', 400)

    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) return errorResponse('Validation failed', 'VALIDATION_ERROR', 400)

    const { email, role, customRoleId } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()
    const roleError = await validateCustomRoleId(ctx.tenant.id, role, customRoleId)
    if (roleError) return errorResponse(roleError, 'INVALID_CUSTOM_ROLE', 400)
    const resolvedCustomRoleId = role === 'PRO' ? (customRoleId ?? null) : null

    const existingUser = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, normalizedEmail),
    })

    if (existingUser) {
      const activeMember = await db.query.tenantMembers.findFirst({
        where: (tm, { and, eq, isNull: isNullFn }) =>
          and(
            eq(tm.tenantId, ctx.tenant.id),
            eq(tm.userId, existingUser.id),
            isNullFn(tm.deletedAt),
          ),
      })

      if (activeMember) {
        return errorResponse(
          'User is already a member of this workspace',
          'ALREADY_MEMBER',
          409,
        )
      }
    }

    const result = await createInvitationAndSendEmail({
      tenantId: ctx.tenant.id,
      tenantSlug: ctx.tenant.slug,
      tenantName: ctx.tenant.name,
      email: normalizedEmail,
      role,
      customRoleId: resolvedCustomRoleId,
      invitedBy: ctx.dbUserId,
    })

    if (result.skipped) {
      return errorResponse(
        'User is already a member of this workspace',
        'ALREADY_MEMBER',
        409,
      )
    }

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
