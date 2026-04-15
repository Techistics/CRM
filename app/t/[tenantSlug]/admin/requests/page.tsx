import { db } from '@/db'
import { roleRequests } from '@/db/schema'
import { desc, and, eq } from 'drizzle-orm'

import RoleRequestRowActions from './RoleRequestRowActions'
import { requireTenantAdminSession } from '@/lib/tenant-server'

export default async function AdminRoleRequestsPage() {
  const { tenant } = await requireTenantAdminSession()

  const pending = await db
    .select()
    .from(roleRequests)
    .where(
      and(
        eq(roleRequests.status, 'pending'),
        eq(roleRequests.tenantId, tenant.id),
      ),
    )
    .orderBy(desc(roleRequests.createdAt))

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-foreground">Access requests</h1>
      <p className="text-muted-foreground text-sm mt-1">
        Approve to add the user to this workspace with the requested role.
      </p>

      {pending.length === 0 ? (
        <div className="mt-8 rounded-xl border bg-card px-6 py-12 text-center text-muted-foreground text-sm">
          No pending requests for this workspace.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Requested role</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.id} className="border-b border-border/80">
                  <td className="px-4 py-3 text-foreground">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground break-all">
                    {r.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-md ${
                        r.requestedRole === 'tenant_admin'
                          ? 'bg-amber-500/15 text-amber-700'
                          : 'bg-purple-500/15 text-purple-700'
                      }`}
                    >
                      {r.requestedRole}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <RoleRequestRowActions id={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
