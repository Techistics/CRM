import Link from 'next/link'
import { asc, count, eq, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { invitations, tenantMembers, tenants } from '@/db/schema'
import { inviteWorkspaceUserAction } from '@/app/platform/actions'
import { DeleteTenantButton } from './DeleteTenantButton'

export default async function PlatformTenantsPage() {
  const all = await db
    .select()
    .from(tenants)
    .where(isNull(tenants.deletedAt))
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

  function getInitials(name: string) {
    const chunks = name.trim().split(/\s+/).filter(Boolean)
    if (chunks.length === 0) return 'WS'
    if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase()
    return `${chunks[0][0]}${chunks[1][0]}`.toUpperCase()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-medium text-[var(--text-strong)]">Workspaces</h1>
          <p className="mt-1 text-[13px] text-[var(--muted-text)]">
            Manage all active workspaces and team memberships
          </p>
        </div>
        <Link
          href="/platform/tenants/new"
          className="rounded-[8px] bg-[#CBEF7F] px-[14px] py-[7px] text-[13px] font-medium text-[#2C5000]"
        >
          New workspace
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-[10px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] px-4 py-3.5">
          <p className="text-[11px] text-[var(--muted-text)]">Total Workspaces</p>
          <p className="mt-1 text-[22px] font-medium text-[var(--text-strong)]">{all.length}</p>
        </div>
        <div className="rounded-[10px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] px-4 py-3.5">
          <p className="text-[11px] text-[var(--muted-text)]">Active Users</p>
          <p className="mt-1 text-[22px] font-medium text-[var(--text-strong)]">{activeUsers}</p>
        </div>
        <div className="rounded-[10px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] px-4 py-3.5">
          <p className="text-[11px] text-[var(--muted-text)]">Pending Invites</p>
          <p className="mt-1 text-[22px] font-medium text-[var(--text-strong)]">{pendingInvites}</p>
        </div>
      </div>

      <div className="grid gap-2">
        {all.map((t) => (
          <div
            key={t.id}
            className="overflow-hidden rounded-[10px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] px-5 py-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[rgba(203,239,127,0.12)] text-[14px] font-medium text-[#CBEF7F]">
                  {getInitials(t.name)}
                </div>
                <div className="space-y-1">
                  <h3 className="text-[14px] font-medium text-[var(--text-strong)]">{t.name}</h3>
                  <code className="rounded-[4px] bg-foreground/5 px-2 py-0.5 text-[11px] text-[var(--muted-text)]">
                    {t.slug}
                  </code>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-[8px] bg-foreground/5 px-3 py-1.5 text-[12px] text-[var(--muted-text)]">
                  {memberCountByTenant[t.id] ?? 0} members
                </span>
                <a
                  href={`/t/${t.slug}`}
                  className="rounded-[8px] border-[0.5px] border-[var(--card-border-color)] bg-transparent px-3 py-1.5 text-[12px] text-[var(--text-strong)]"
                >
                  Login as Admin
                </a>
                <DeleteTenantButton tenantId={t.id} />
              </div>
            </div>

            <div className="my-3 border-t-[0.5px] border-[var(--card-border-color)]" />

            <div>
              <p className="mb-3 text-[11px] uppercase tracking-[0.07em] text-[var(--muted-text)]">
                Manual invite
              </p>
              <form action={inviteWorkspaceUserAction} className="flex flex-wrap items-end gap-2.5">
                <input type="hidden" name="tenantId" value={t.id} />
                <div className="min-w-[220px] flex-1">
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    className="h-9 w-full rounded-[8px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] px-3 text-[13px] text-[var(--text-strong)] outline-none placeholder:text-[var(--muted-text)]"
                  />
                </div>
                <div>
                  <select
                    name="role"
                    defaultValue="PRO"
                    className="h-9 rounded-[8px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] px-3 text-[13px] text-[var(--text-strong)] outline-none"
                  >
                    <option value="PRO">Pro (Agent)</option>
                    <option value="ADMIN">Admin (Workspace Owner)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="rounded-[8px] bg-[#CBEF7F] px-4 py-[7px] text-[13px] font-medium text-[#2C5000]"
                >
                  Send invite
                </button>
              </form>
            </div>
          </div>
        ))}

        {all.length === 0 && (
          <div className="rounded-[10px] border-[0.5px] border-dashed border-[var(--card-border-color)] bg-[var(--card-bg)] px-6 py-10 text-center">
            <p className="text-[13px] text-[var(--muted-text)]">No active workspaces found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
