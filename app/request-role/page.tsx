import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { roleRequests } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { SignOutButton } from '@clerk/nextjs'
import RequestRoleForm from './RequestRoleForm'
import { getRootDomain } from '@/lib/public-url'

export default async function RequestRolePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const client = await clerkClient()
  const memberships = await client.users.getOrganizationMembershipList({
    userId,
  })
  if (memberships.data.length > 0) {
    redirect('/')
  }

  const mine = await db
    .select()
    .from(roleRequests)
    .where(eq(roleRequests.clerkId, userId))
    .orderBy(desc(roleRequests.createdAt))

  const pending = mine.find((r) => r.status === 'pending')
  const latest = mine[0]
  const lastRejected = Boolean(
    latest && latest.status === 'rejected' && !pending,
  )

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/50 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-xl font-semibold">Request access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Submit a request from your team&apos;s workspace URL (e.g.{' '}
          <code className="text-xs bg-muted px-1 rounded">
            https://yourteam.{getRootDomain()}/request-role
          </code>
          ) so it is tied to the correct organization.
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
                .
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
