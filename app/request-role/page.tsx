import { redirect } from 'next/navigation'
import { db } from '@/db'
import { roleRequests } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import RequestRoleForm from './RequestRoleForm'
import { getRootOrigin } from '@/lib/public-url'
import { getSession } from '@/lib/auth'
import Link from 'next/link'

export default async function RequestRolePage() {
  const session = await getSession()
  if (!session) redirect('/sign-in')

  const mine = await db
    .select()
    .from(roleRequests)
    .where(eq(roleRequests.userId, session.userId))
    .orderBy(desc(roleRequests.createdAt))

  const pending = mine.find((r) => r.status === 'PENDING')
  const latest = mine[0]
  const lastRejected = Boolean(
    latest && latest.status === 'REJECTED' && !pending,
  )

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/50 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-xl font-semibold">Request access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Submit a request from your team&apos;s workspace URL (e.g.{' '}
          <code className="text-xs bg-muted px-1 rounded">
            https://yourteam.{getRootOrigin().replace(/^https?:\/\//, '')}/request-role
          </code>
          ) so it is tied to the correct organization.
        </p>

        {pending ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
              <p className="font-medium text-primary">Request pending</p>
              <p className="mt-2 text-muted-foreground">
                You asked for{' '}
                <strong className="text-foreground">
                  {pending.requestedRole}
                </strong>{' '}
                access as{' '}
                <span className="text-foreground/80">{pending.email}</span>.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Submitted{' '}
                {pending.createdAt
                  ? new Date(pending.createdAt).toLocaleString()
                  : '—'}
                .
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/api/auth/logout"
                className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Sign out
              </Link>
            </div>
          </div>
        ) : (
          <>
            <RequestRoleForm lastRejected={lastRejected} />
            <div className="mt-4 flex justify-center">
              <Link
                href="/api/auth/logout"
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Sign out
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
