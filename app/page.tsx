import { redirect } from 'next/navigation'
import { and, asc, eq, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { tenantMembers, tenants } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { isPlatformSuperAdmin } from '@/lib/platform-role'
import { workspaceOrigin } from '@/lib/public-url'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const AVATAR_COLORS = [
  { bg: 'bg-sky-100 dark:bg-sky-900/40', text: 'text-sky-700 dark:text-sky-300' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-700 dark:text-rose-300' },
]

export default async function Home() {
  const session = await getSession()

  if (!session) redirect('/sign-in')

  const superAdmin = await isPlatformSuperAdmin()
  if (superAdmin) redirect('/platform')

  const list = await db
    .select({ id: tenants.id, slug: tenants.slug, name: tenants.name })
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

  if (list.length === 0) redirect('/request-role')
  if (list.length === 1) redirect(workspaceOrigin(list[0].slug))

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-5">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Your workspaces</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select a workspace to continue</p>
        </div>

        {/* Workspace list */}
        <ul className="space-y-2.5">
          {list.map((t, i) => {
            const color = AVATAR_COLORS[i % AVATAR_COLORS.length]
            return (
              <li key={t.id}>
                <a
                  href={workspaceOrigin(t.slug)}
                  className="flex items-center gap-3.5 px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all duration-150 group"
                >
                  <div className={`w-9 h-9 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-xs font-semibold ${color.text}`}>{getInitials(t.name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{t.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{t.slug}</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </a>
              </li>
            )
          })}
        </ul>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
          <a
            href="/sign-out"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Sign out
          </a>
        </div>

      </div>
    </main>
  )
}