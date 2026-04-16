import { redirect } from 'next/navigation'
import { asc } from 'drizzle-orm'

import { db } from '@/db'
import { tenants, tenantMembers } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq } from 'drizzle-orm'

export default async function Home() {
  const session = await getSession()
  if (!session) redirect('/sign-in')
  if (session.role === 'super_admin') redirect('/platform')

  const memberships = await db
    .select({ tenantId: tenantMembers.tenantId })
    .from(tenantMembers)
    .where(eq(tenantMembers.userId, session.userId))

  if (memberships.length === 0) redirect('/no-access?reason=no-workspace')

  const tenantIds = memberships.map((m) => m.tenantId)

  const list = await db
    .select()
    .from(tenants)
    .where(eq(tenants.status, 'active'))
    .orderBy(asc(tenants.name))

  const userTenants = list.filter((t) => tenantIds.includes(t.id))

  if (userTenants.length === 1) {
    redirect(`/t/${userTenants[0].slug}`)
  }

  return (
    <main className="min-h-screen bg-muted/50 px-4 py-12">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-semibold text-foreground">Your workspaces</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Click on a workspace to open it.
        </p>
        <ul className="mt-8 space-y-3">
          {userTenants.map((t) => (
            <li key={t.id}>
              <a  // ← was missing the opening `<a`
                href={`/t/${t.slug}`}
                className="block rounded-xl border bg-card p-4 text-card-foreground shadow-sm hover:bg-muted/40 transition-colors"
              >
                <p className="font-medium">{t.brandName ?? t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.slug}</p>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}