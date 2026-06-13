import { NextRequest } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { tenantMembers } from '@/db/schema'
import { requirePermissionApi } from '@/lib/tenant-api'
import { sendInviteEmail } from '@/lib/mail'
import { createInvitationAndSendEmail } from '@/lib/invitations/service'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'
import { eq, and, isNull, isNotNull } from 'drizzle-orm'
import { getRootOrigin } from '@/lib/public-url'
import { validateCustomRoleId } from '@/lib/validate-custom-role'
const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'PRO']),
  name: z.string().optional(),
  customRoleId: z.string().uuid().nullable().optional(),
})

export async function POST(
  req: NextRequest
) {
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

    // 1. Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, normalizedEmail),
    })

    if (existingUser) {
      // 1️⃣ Find an existing tenantMember, **excluding** soft‑deleted rows
      const member = await db.query.tenantMembers.findFirst({
        where: (tm, { and, eq, isNull }) =>
          and(
            eq(tm.tenantId, ctx.tenant.id),
            eq(tm.userId, existingUser.id),
            isNull(tm.deletedAt), // only active members
          ),
      });

      // 2️⃣ If an **active** member exists → reject (unchanged behaviour)
      if (member) {
        return errorResponse(
          'User is already a member of this workspace',
          'ALREADY_MEMBER',
          409
        );
      }

      // 3️⃣ Check for a **soft‑deleted** record (deletedAt NOT NULL)
      const softDeleted = await db.query.tenantMembers.findFirst({
        where: (tm, { and, eq, isNotNull }) =>
          and(
            eq(tm.tenantId, ctx.tenant.id),
            eq(tm.userId, existingUser.id),
            isNotNull(tm.deletedAt), // soft‑deleted
          ),
      });

      if (softDeleted) {
        // Restore the member and set the requested role
        await db
          .update(tenantMembers)
          .set({ deletedAt: null, role: role as 'ADMIN' | 'PRO', customRoleId: resolvedCustomRoleId })
          .where(eq(tenantMembers.id, softDeleted.id));

        // Build the invite link (no token in this flow, use workspace URL)
        const baseUrl = getRootOrigin();
        const inviteLink = `${baseUrl}/t/${ctx.tenant.slug}/pro/overview`;

        try {
          await sendInviteEmail({
            email: normalizedEmail,
            tenantName: ctx.tenant.name,
            inviteLink,
          });
        } catch (err) {
          console.error('[invite] Restore email failed:', err);
        }

        return successResponse({ restored: true }, 200);
      }

      // 4️⃣ User exists but **not** a member of this tenant → add them directly
      await db.insert(tenantMembers).values({
        tenantId: ctx.tenant.id,
        userId: existingUser.id,
        role,
        customRoleId: resolvedCustomRoleId,
      });

      // Build the invite link for a freshly‑added user (no token, use workspace URL)
      const baseUrl = getRootOrigin();
      const inviteLink = `${baseUrl}/t/${ctx.tenant.slug}/pro/overview`;

      try {
        await sendInviteEmail({
          email: normalizedEmail,
          tenantName: ctx.tenant.name,
          inviteLink,
        });
      } catch (err) {
        console.error('[invite] Direct add email failed:', err);
      }

      return successResponse({ added: true }, 200);
    }

    // 2. User does not exist -> Create invitation
    const result = await createInvitationAndSendEmail({
      tenantId: ctx.tenant.id,
      tenantSlug: ctx.tenant.slug,
      tenantName: ctx.tenant.name,
      email: normalizedEmail,
      role,
      customRoleId: resolvedCustomRoleId,
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
