import { db } from '@/db'
import { users, leads, tenantMembers, invitations } from '@/db/schema'
import { eq, count, and, not, or, isNull, ne } from 'drizzle-orm'

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
    .where(and(
      eq(tenantMembers.tenantId, tenant.id),
      isNull(tenantMembers.deletedAt)
    ))

  const leadCounts = await db
    .select({
      assignedTo: leads.assignedTo,
      total: count(leads.id),
    })
    .from(leads)
    .where(tScope)
    .groupBy(leads.assignedTo)

  const activeCounts = await db
    .select({
      assignedTo: leads.assignedTo,
      total: count(leads.id),
    })
    .from(leads)
    .where(and(tScope, eq(leads.stage, 'new_lead')))
    .groupBy(leads.assignedTo)

  const paidCounts = await db
    .select({
      assignedTo: leads.assignedTo,
      total: count(leads.id),
    })
    .from(leads)
    .where(and(tScope, eq(leads.stage, 'paid')))
    .groupBy(leads.assignedTo)

  const pendingInvites = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.tenantId, tenant.id), eq(invitations.status, 'PENDING')))

  const inviteData = pendingInvites.map((invite) => ({
    id: invite.id,
    name: '—',
    email: invite.email,
    role: invite.role,
    totalLeads: 0,
    activeLeads: 0,
    paidLeads: 0,
    status: 'pending_invite' as const,
    invitationId: invite.id,
  }))

  const teamData = [
    ...members.map((user) => ({
      ...user,
      totalLeads: Number(leadCounts.find((l) => l.assignedTo === user.id)?.total ?? 0),
      activeLeads: Number(activeCounts.find((l) => l.assignedTo === user.id)?.total ?? 0),
      paidLeads: Number(paidCounts.find((l) => l.assignedTo === user.id)?.total ?? 0),
      status: 'active' as const,
      invitationId: null as string | null,
    })),
    ...inviteData,
  ]

  return (
    <TeamManagementClient
      initialMembers={teamData.map((m) => ({
        ...m,
        totalLeads: Number(m.totalLeads),
        activeLeads: Number(m.activeLeads),
        paidLeads: Number(m.paidLeads),
      }))}
    />
  )
}
