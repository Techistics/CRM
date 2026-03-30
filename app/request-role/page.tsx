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
    <main className="flex min-h-screen items-center justify-center bg-muted/50 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-xl font-semibold">Request access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose the role you need. An admin will review and approve your account in the CRM.
        </p>

        {pending ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
              <p className="font-medium text-primary">Request pending</p>
              <p className="mt-2 text-muted-foreground">
                You asked for <strong className="text-foreground">{pending.requestedRole}</strong> access as{' '}
                <span className="text-foreground/80">{pending.email}</span>.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Submitted {pending.createdAt ? new Date(pending.createdAt).toLocaleString() : '—'}. An admin
                will approve or decline soon.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <SignOutButton redirectUrl="/sign-in">
                <button
                  type="button"
                  className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
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
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
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
