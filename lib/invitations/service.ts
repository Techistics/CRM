import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { tenantMembers, tenants } from '@/db/schema'


import { db } from '@/db'
import { invitations } from '@/db/schema'
import { sendInviteEmail } from '@/lib/mail'
import { getRootOrigin } from '@/lib/public-url'
import { and, eq } from 'drizzle-orm'

type InviteRole = 'ADMIN' | 'PRO'

export async function createInvitationAndSendEmail({
  tenantId,
  tenantSlug,
  tenantName,
  email,
  role,
  customRoleId,
  invitedBy,
}: {
  tenantId: string
  tenantSlug: string
  tenantName: string
  email: string
  role: InviteRole
  customRoleId?: string | null
  invitedBy: string
}) {
  const { users } = await import('@/db/schema')
  const existingMember = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  })
  if (existingMember) {
    const activeMembership = await db.query.tenantMembers.findFirst({
      where: (tm, { and, eq, isNull }) =>
        and(
          eq(tm.tenantId, tenantId),
          eq(tm.userId, existingMember.id),
          isNull(tm.deletedAt),
        ),
    })
    if (activeMembership) {
      return { token: '', invitationId: '', emailSent: false, skipped: true }
    }
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const [invitation] = await db
    .insert(invitations)
    .values({
      tenantId,
      email,
      role,
      customRoleId: customRoleId ?? null,
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
    token,
    invitationId: invitation.id,
    emailSent: emailResult.success,
  }
}

// Accept an invitation for a logged-in user
export async function acceptInvitationForUser(invitationId: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  // Fetch invitation
  const [invite] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.id, invitationId), eq(invitations.status, 'PENDING')))
    .limit(1)

  if (!invite) throw new Error('Invitation not found or already accepted')

  // Verify email matches session user
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, session.userId),
  })
  if (!user) throw new Error('User not found')
  if (invite.email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
    throw new Error('This invitation was sent to a different email address.')
  }

  // Transaction: add membership and mark accepted
  await db.transaction(async (tx) => {
    await tx.insert(tenantMembers).values({
      tenantId: invite.tenantId,
      userId: session.userId,
      role: invite.role,
      customRoleId: invite.customRoleId,
    }).onConflictDoNothing()
    await tx.update(invitations)
      .set({ status: 'ACCEPTED' })
      .where(eq(invitations.id, invite.id))
  })

  const [tenant] = await db.select({ slug: tenants.slug }).from(tenants).where(eq(tenants.id, invite.tenantId)).limit(1)
  if (!tenant) throw new Error('Tenant not found')

  const targetPath = invite.role === 'ADMIN' ? 'admin/overview' : 'pro/overview'
  return { success: true, redirectPath: `/t/${tenant.slug}/${targetPath}` }
}
