import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { asc, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { tenants } from '@/db/schema'
import { isPlatformSuperAdmin } from '@/lib/platform-role'
import { workspaceOrigin } from '@/lib/public-url'

export default async function Home() {
  const { userId } = await auth()

  if (!userId) redirect('/sign-in')

  const superAdmin = await isPlatformSuperAdmin()
  if (superAdmin) {
    redirect('/platform')
  }

  const client = await clerkClient()
  const memberships = await client.users.getOrganizationMembershipList({
    userId,
  })
  const orgIds = memberships.data.map((m) => m.organization.id)
  if (orgIds.length === 0) {
    redirect('/request-role')
  }

  const list = await db
    .select()
    .from(tenants)
    .where(inArray(tenants.clerkOrgId, orgIds))
    .orderBy(asc(tenants.name))

  if (list.length === 1) {
    redirect(workspaceOrigin(list[0].slug))
  }

  return (
    <main className="min-h-screen bg-muted/50 px-4 py-12">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-semibold text-foreground">Your workspaces</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Click on a workspace to open it.
        </p>
        <ul className="mt-8 space-y-3">
          {list.map((t) => (
            <li key={t.id}>
              <a
                href={workspaceOrigin(t.slug)}
                className="block rounded-xl border bg-card p-4 text-card-foreground shadow-sm hover:bg-muted/40 transition-colors"
              >
                <p className="font-medium">{t.brandName ?? t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.slug}</p>
              </a>
            </li>
          ))}
        </ul>
        {list.length === 0 && (
          <div className="mt-6 space-y-3 text-sm text-muted-foreground">
            <p>
              Your account is in a Clerk organization, but that organization is not
              registered as a workspace in this app yet (or you used a different Clerk
              app / environment).
            </p>
            <p>
              If you just accepted an email invite, ask your admin to resend it after
              the app is updated, or open the invite link again — you should land
              directly in the workspace.
            </p>
            <p>
              Platform admins: create the workspace from{' '}
              <span className="font-medium text-foreground">Platform → Workspaces</span>{' '}
              so the Clerk org id is linked in the database.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
