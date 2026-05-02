import crypto from 'crypto'

import { db } from '@/db'
import { invitations } from '@/db/schema'
import { sendInviteEmail } from '@/lib/mail'
import { getRootOrigin } from '@/lib/public-url'

type InviteRole = 'ADMIN' | 'PRO'

export async function createInvitationAndSendEmail({
  tenantId,
  tenantSlug,
  tenantName,
  email,
  role,
  invitedBy,
}: {
  tenantId: string
  tenantSlug: string
  tenantName: string
  email: string
  role: InviteRole
  invitedBy: string
}) {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const [invitation] = await db
    .insert(invitations)
    .values({
      tenantId,
      email,
      role,
      token,
      expiresAt,
      invitedBy,
      status: 'PENDING',
    })
    .returning({ id: invitations.id })

  const inviteLink = `${getRootOrigin()}/invite/accept?token=${token}&highlight=${tenantSlug}`
  const workspaceUrl = `${getRootOrigin()}/t/${tenantSlug}`
  const emailResult = await sendInviteEmail({
    email,
    tenantName,
    inviteLink,
    workspaceUrl,
  })

  if (!emailResult.success) {
    console.error('[invite] email send failed', {
      invitationId: invitation.id,
      tenantId,
      email,
    })
  }

  return {
    invitationId: invitation.id,
    emailSent: emailResult.success,
  }
}
