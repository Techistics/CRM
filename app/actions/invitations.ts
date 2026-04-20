'use server'

import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { invitations, tenantMembers, tenants } from '@/db/schema'
import { getSession } from '@/lib/auth'

/**
 * Server action to manually accept a workspace invitation.
 */
export async function acceptInviteAction(invitationId: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  // 1. Fetch user to verify email
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, session.userId)
  })
  if (!user) throw new Error('User not found')

  // 2. Find the specific invitation
  const [invite] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.id, invitationId), eq(invitations.status, 'PENDING')))
    .limit(1)

  if (!invite) throw new Error('Invitation not found or already accepted')

  // 3. Security check: Ensure the invite was meant for this user
  if (invite.email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
    throw new Error('This invitation was sent to a different email address.')
  }

  // Atomic transaction for membership and invitation status
  await db.transaction(async (tx) => {
    // 3. Create membership
    await tx.insert(tenantMembers).values({
      tenantId: invite.tenantId,
      userId: session.userId,
      role: invite.role,
    }).onConflictDoNothing()

    // 4. Mark as accepted
    await tx.update(invitations)
      .set({ status: 'ACCEPTED' })
      .where(eq(invitations.id, invite.id))
  })

  // 5. Fetch tenant slug for redirect
  const [tenant] = await db.select({ slug: tenants.slug }).from(tenants).where(eq(tenants.id, invite.tenantId)).limit(1)
  if (!tenant) throw new Error('Tenant not found')

  const targetPath = invite.role === 'ADMIN' ? 'admin/overview' : 'pro/overview'
  return {
    success: true,
    redirectPath: `/t/${tenant.slug}/${targetPath}`,
  }
}
