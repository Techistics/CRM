import { redirect } from 'next/navigation'
import { db } from '@/db'
import { roleRequests } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { requireAdminClerkId } from '@/lib/admin-auth'
import RoleRequestRowActions from './RoleRequestRowActions'

export default async function AdminRoleRequestsPage() {
  const adminId = await requireAdminClerkId()
  if (!adminId) redirect('/')

  const pending = await db
    .select()
    .from(roleRequests)
    .where(eq(roleRequests.status, 'pending'))
    .orderBy(desc(roleRequests.createdAt))

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-white">Access requests</h1>
      <p className="text-gray-400 text-sm mt-1">
        New sign-ups choose a role here; approve to set their Clerk role and sync them into the database.
      </p>

      {pending.length === 0 ? (
        <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 px-6 py-12 text-center text-gray-500 text-sm">
          No pending requests.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Requested role</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.id} className="border-b border-gray-800/80 bg-gray-900/50">
                  <td className="px-4 py-3 text-white">{r.name}</td>
                  <td className="px-4 py-3 text-gray-400 break-all">{r.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-md ${
                        r.requestedRole === 'admin'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-purple-500/15 text-purple-300'
                      }`}
                    >
                      {r.requestedRole}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
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
