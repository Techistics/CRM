import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { roleRequests } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { getUserRole } from '@/lib/role'
import { SignOutButton } from '@clerk/nextjs'
import RequestRoleForm from './RequestRoleForm'

export default async function RequestRolePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getUserRole()
  if (role === 'admin') redirect('/admin/overview')
  if (role === 'pro') redirect('/pro/overview')

  const mine = await db
    .select()
    .from(roleRequests)
    .where(eq(roleRequests.clerkId, userId))
    .orderBy(desc(roleRequests.createdAt))

  const pending = mine.find((r) => r.status === 'pending')
  const latest = mine[0]
  const lastRejected = Boolean(latest && latest.status === 'rejected' && !pending)

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-6 py-12 text-white">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <h1 className="text-xl font-semibold">Request access</h1>
        <p className="mt-2 text-sm text-gray-400">
          Choose the role you need. An admin will review and approve your account in the CRM.
        </p>

        {pending ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 text-sm">
              <p className="text-emerald-400 font-medium">Request pending</p>
              <p className="text-gray-400 mt-2">
                You asked for <strong className="text-white">{pending.requestedRole}</strong> access as{' '}
                <span className="text-gray-300">{pending.email}</span>.
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Submitted {pending.createdAt ? new Date(pending.createdAt).toLocaleString() : '—'}. An admin
                will approve or decline soon.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <SignOutButton redirectUrl="/sign-in">
                <button
                  type="button"
                  className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
                >
                  Sign out
                </button>
              </SignOutButton>
            </div>
          </div>
        ) : (
          <>
            <RequestRoleForm lastRejected={lastRejected} />
            <div className="mt-4 flex justify-center">
              <SignOutButton redirectUrl="/sign-in">
                <button
                  type="button"
                  className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2"
                >
                  Sign out
                </button>
              </SignOutButton>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
