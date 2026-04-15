import { db } from '@/db'
import { users, leads, tenantMembers, invitations } from '@/db/schema'
import { eq, count, and, isNull } from 'drizzle-orm'

import { requireTenantAdminSession } from '@/lib/tenant-server'
import TeamManagementClient from './TeamManagementClient'

export default async function TeamPage() {
  const { tenant } = await requireTenantAdminSession()
  const tScope = eq(leads.tenantId, tenant.id)

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: tenantMembers.role,
    })
    .from(tenantMembers)
    .innerJoin(users, eq(tenantMembers.userId, users.id))
    .where(eq(tenantMembers.tenantId, tenant.id))

  const leadCounts = await db
    .select({ assignedTo: leads.assignedTo, total: count(leads.id) })
    .from(leads)
    .where(tScope)
    .groupBy(leads.assignedTo)

  const activeCounts = await db
    .select({ assignedTo: leads.assignedTo, total: count(leads.id) })
    .from(leads)
    .where(and(tScope, eq(leads.stage, 'new_lead')))
    .groupBy(leads.assignedTo)

  const paidCounts = await db
    .select({ assignedTo: leads.assignedTo, total: count(leads.id) })
    .from(leads)
    .where(and(tScope, eq(leads.stage, 'paid')))
    .groupBy(leads.assignedTo)

  const teamData = members.map((user) => ({
    ...user,
    totalLeads: Number(leadCounts.find((l) => l.assignedTo === user.id)?.total ?? 0),
    activeLeads: Number(activeCounts.find((l) => l.assignedTo === user.id)?.total ?? 0),
    paidLeads: Number(paidCounts.find((l) => l.assignedTo === user.id)?.total ?? 0),
    status: 'active' as const,
    invitationId: null as string | null,
  }))

  // ── Pending invitations from your own invitations table ──
  const pendingInvites = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.tenantId, tenant.id),
        isNull(invitations.acceptedAt),
      ),
    )

  const activeEmails = new Set(teamData.map((m) => m.email.toLowerCase()))

  const pendingInviteRows = pendingInvites
    .filter((inv) => !activeEmails.has(inv.email.toLowerCase()))
    .filter((inv) => new Date() < new Date(inv.expiresAt))
    .map((inv) => ({
      id: `invite:${inv.id}`,
      name: inv.email.split('@')[0] ?? 'Invited user',
      email: inv.email,
      role: inv.role as 'tenant_admin' | 'agent',
      totalLeads: 0,
      activeLeads: 0,
      paidLeads: 0,
      status: 'pending_invite' as const,
      invitationId: inv.id,
    }))

  return (
    <TeamManagementClient
      initialMembers={[...teamData, ...pendingInviteRows]}
    />
  )
}