import Link from 'next/link'
import { asc, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { tenants } from '@/db/schema'
import { inviteWorkspaceUserAction } from '@/app/platform/actions'
import { DeleteTenantButton } from './DeleteTenantButton'

export default async function PlatformTenantsPage() {
  const all = await db
    .select()
    .from(tenants)
    .where(isNull(tenants.deletedAt))
    .orderBy(asc(tenants.name))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Workspaces</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all active workspaces and team memberships.
          </p>
        </div>
        <Link
          href="/platform/tenants/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          New workspace
        </Link>
      </div>

      <div className="grid gap-6">
        {all.map((t) => (
          <div key={t.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-muted/30 border-b flex items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg">{t.name}</h3>
                <code className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border">
                  {t.slug}
                </code>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={`/t/${t.slug}`}
                  className="rounded-lg bg-white border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Login as Admin
                </a>
                <DeleteTenantButton tenantId={t.id} />
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                Manual Invite
              </p>
              <form action={inviteWorkspaceUserAction} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="tenantId" value={t.id} />
                <div className="min-w-64 flex-1">
                  <label className="text-[11px] font-bold text-muted-foreground ml-1 mb-1 block">Email Address</label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="user@gmail.com"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground ml-1 mb-1 block">Assigned Role</label>
                  <select
                    name="role"
                    defaultValue="PRO"
                    className="rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  >
                    <option value="PRO">Pro (Agent)</option>
                    <option value="ADMIN">Admin (Workspace Owner)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 shadow-sm"
                >
                  Send Invite
                </button>
              </form>
            </div>
          </div>
        ))}

        {all.length === 0 && (
          <div className="rounded-2xl border border-dashed p-12 text-center bg-muted/20">
            <p className="text-sm text-muted-foreground font-medium">
              No active workspaces found.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
