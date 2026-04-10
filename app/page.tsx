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
          <p className="mt-6 text-sm text-muted-foreground">
            You belong to Clerk organizations that are not linked yet. Ask the platform
            admin to register your workspace, or ensure the organization was created from
            the platform console.
          </p>
        )}
      </div>
    </main>
  )
}
