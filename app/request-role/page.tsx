import { redirect } from 'next/navigation'
import { db } from '@/db'
import { roleRequests, tenantMembers } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { destroySession } from '@/lib/auth'
import RequestRoleForm from './RequestRoleForm'

export default async function RequestRolePage() {
  const session = await getSession()
  if (!session) redirect('/sign-in')

  // ── If already a member of a workspace, redirect home ──
  const [membership] = await db
    .select()
    .from(tenantMembers)
    .where(eq(tenantMembers.userId, session.userId))

  if (membership) redirect('/')

  const mine = await db
    .select()
    .from(roleRequests)
    .where(eq(roleRequests.userId, session.userId))
    .orderBy(desc(roleRequests.createdAt))

  const pending = mine.find((r) => r.status === 'pending')
  const latest = mine[0]
  const lastRejected = Boolean(latest && latest.status === 'rejected' && !pending)

  async function signOut() {
    'use server'
    await destroySession()
    redirect('/sign-in')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/50 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-xl font-semibold">Request access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Submit a request to get access to your team's workspace.
        </p>

        {pending ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
              <p className="font-medium text-primary">Request pending</p>
              <p className="mt-2 text-muted-foreground">
                You asked for{' '}
                <strong className="text-foreground">{pending.requestedRole}</strong>{' '}
                access as{' '}
                <span className="text-foreground/80">{pending.email}</span>.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Submitted{' '}
                {pending.createdAt
                  ? new Date(pending.createdAt).toLocaleString()
                  : '—'}
              </p>
            </div>
            <form action={signOut} className="flex justify-center">
              <button
                type="submit"
                className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <>
            <RequestRoleForm lastRejected={lastRejected} />
            <form action={signOut} className="mt-4 flex justify-center">
              <button
                type="submit"
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Sign out
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}