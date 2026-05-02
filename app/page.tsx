import { redirect } from 'next/navigation'
import { and, asc, eq, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { tenantMembers, tenants } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { isPlatformSuperAdmin } from '@/lib/platform-role'
import { workspaceOrigin } from '@/lib/public-url'

export default async function Home() {
  const session = await getSession()

  if (!session) redirect('/sign-in')

  const superAdmin = await isPlatformSuperAdmin()
  if (superAdmin) {
    redirect('/platform')
  }

  const list = await db
    .select({
      id: tenants.id,
      slug: tenants.slug,
      name: tenants.name,
    })
    .from(tenants)
    .innerJoin(tenantMembers, eq(tenantMembers.tenantId, tenants.id))
    .where(
      and(
        eq(tenants.status, 'active'),
        isNull(tenants.deletedAt),
        eq(tenantMembers.userId, session.userId),
        isNull(tenantMembers.deletedAt),
      ),
    )
    .orderBy(asc(tenants.name))

  if (list.length === 0) {
    redirect('/request-role')
  }

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
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.slug}</p>
              </a>
            </li>
          ))}
        </ul>
        {list.length === 0 && (
          <div className="mt-6 space-y-3 text-sm text-muted-foreground">
            <p>
              Your account is signed in, but no active workspace membership is
              available yet.
            </p>
            <p>
              If you just accepted an invite, try opening that invite link again or
              ask your admin to re-send it.
            </p>
            <p>
              If this persists, request access from your team workspace URL.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
