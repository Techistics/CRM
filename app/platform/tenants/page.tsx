import Link from 'next/link'
import { asc } from 'drizzle-orm'

import { db } from '@/db'
import { tenants } from '@/db/schema'
import { inviteWorkspaceUserAction } from '@/app/platform/actions'

export default async function PlatformTenantsPage() {
  const all = await db.select().from(tenants).orderBy(asc(tenants.name))

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Workspaces</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all your workspaces and team members.
          </p>
        </div>
        <Link
          href="/platform/tenants/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          New workspace
        </Link>
      </div>

      <ul className="mt-8 divide-y rounded-xl border bg-card">
        {all.map((t) => (
          <li key={t.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{t.brandName ?? t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.slug} · {t.status}
                </p>
              </div>
              <a
                href={`/t/${t.slug}`}
                className="text-sm text-primary hover:underline"
              >
                Open →
              </a>
            </div>
            <form action={inviteWorkspaceUserAction} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="tenantId" value={t.id} />
              <div className="min-w-56 flex-1">
                <label className="text-xs text-muted-foreground">Invite by email</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="user@gmail.com"
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Role</label>
                <select
                  name="role"
                  defaultValue="agent"
                  className="mt-1 rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="agent">Agent (org:member)</option>
                  <option value="tenant_admin">Admin (org:admin)</option>
                </select>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Send invite
              </button>
            </form>
          </li>
        ))}
        {all.length === 0 && (
          <li className="px-4 py-12 text-center text-sm text-muted-foreground">
            No workspaces yet.
          </li>
        )}
      </ul>
    </div>
  )
}
