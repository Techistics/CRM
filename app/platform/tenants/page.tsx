import Link from 'next/link'
import { asc, count, eq, isNull, and, ilike } from 'drizzle-orm'

import { db } from '@/db'
import { invitations, tenantMembers, tenants } from '@/db/schema'
import { TenantListClient } from './TenantListClient'

export default async function PlatformTenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams

  const all = await db
    .select()
    .from(tenants)
    .where(
      and(
        isNull(tenants.deletedAt),
        q ? ilike(tenants.name, `%${q}%`) : undefined
      )
    )
    .orderBy(asc(tenants.name))

  const members = await db
    .select({
      tenantId: tenantMembers.tenantId,
      userId: tenantMembers.userId,
    })
    .from(tenantMembers)
    .where(isNull(tenantMembers.deletedAt))

  const [{ pendingInvites }] = await db
    .select({
      pendingInvites: count(),
    })
    .from(invitations)
    .where(eq(invitations.status, 'PENDING'))

  const memberCountByTenant = members.reduce<Record<string, number>>((acc, member) => {
    acc[member.tenantId] = (acc[member.tenantId] ?? 0) + 1
    return acc
  }, {})
  const activeUsers = new Set(members.map((member) => member.userId)).size

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-[22px] font-bold text-[var(--text-strong)] tracking-tight">Workspaces</h1>
          <p className="text-[14px] font-medium text-[var(--muted-text)]">
            Manage all active workspaces and team memberships across the platform.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-[var(--radius-card)] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] px-5 py-4 shadow-sm  bg-green-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-text)]">Total Workspaces</p>
          <p className="mt-1 text-[26px] font-bold text-[var(--text-strong)]">{all.length}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] px-5 py-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-text)]">Active Users</p>
          <p className="mt-1 text-[26px] font-bold text-[var(--text-strong)]">{activeUsers}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] px-5 py-4 shadow-sm  bg-red-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-text)]">Pending Invites</p>
          <p className="mt-1 text-[26px] font-bold text-[var(--text-strong)]">{pendingInvites}</p>
        </div>
      </div>

      <TenantListClient tenants={all} memberCountByTenant={memberCountByTenant} />
    </div>
  )
}
