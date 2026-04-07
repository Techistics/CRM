import { db } from '@/db'
import { users, leads, tenantMembers } from '@/db/schema'
import { eq, count, and } from 'drizzle-orm'
import { clerkClient } from '@clerk/nextjs/server'

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
    .where(and(eq(tenantMembers.tenantId, tenant.id)))

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

  const teamData = members.map((user) => ({
    ...user,
    totalLeads: leadCounts.find((l) => l.assignedTo === user.id)?.total ?? 0,
    activeLeads: activeCounts.find((l) => l.assignedTo === user.id)?.total ?? 0,
    paidLeads: paidCounts.find((l) => l.assignedTo === user.id)?.total ?? 0,
    status: 'active' as const,
    invitationId: null as string | null,
  }))

  const client = await clerkClient()
  const invites = await client.organizations.getOrganizationInvitationList({
    organizationId: tenant.clerkOrgId,
    status: ['pending'],
    limit: 100,
  })

  const activeEmails = new Set(teamData.map((m) => m.email.toLowerCase()))
  const pendingInviteRows = invites.data
    .filter((inv) => {
      const email = (inv.emailAddress ?? '').toLowerCase()
      return email && !activeEmails.has(email)
    })
    .map((inv) => ({
      id: `invite:${inv.id}`,
      name: inv.emailAddress?.split('@')[0] ?? 'Invited user',
      email: inv.emailAddress ?? '—',
      role: (inv.role === 'org:admin' ? 'tenant_admin' : 'agent') as
        | 'tenant_admin'
        | 'agent',
      totalLeads: 0,
      activeLeads: 0,
      paidLeads: 0,
      status: 'pending_invite' as const,
      invitationId: inv.id ?? null,
    }))

  return (
    <TeamManagementClient
      initialMembers={[...teamData, ...pendingInviteRows].map((m) => ({
        ...m,
        totalLeads: Number(m.totalLeads),
        activeLeads: Number(m.activeLeads),
        paidLeads: Number(m.paidLeads),
      }))}
    />
  )
}