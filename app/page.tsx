import { redirect } from 'next/navigation'
import { asc, eq, and } from 'drizzle-orm'

import { db } from '@/db'
import { tenants, tenantMembers, invitations } from '@/db/schema'
import { isPlatformSuperAdmin } from '@/lib/platform-role'
import { workspaceOrigin } from '@/lib/public-url'
import { getSession } from '@/lib/auth'
import { AcceptInviteButton } from '@/components/invitations/AcceptInviteButton'
import Link from 'next/link'

export default async function Home() {
  const session = await getSession()
  if (!session) redirect('/sign-in')

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, session.userId)
  })

  // If session exists but user is not in DB, clear session to break redirect loop
  if (!user) redirect('/api/auth/logout')

  const superAdmin = await isPlatformSuperAdmin()
  // We no longer immediately redirect Superadmins to /platform, 
  // so they can use the workspace selection screen to see everything.

  // 1. Fetch workspaces. Superadmins see EVERYTHING. Regular users see MEMBERSHIPS.
  let workspaces;
  if (superAdmin) {
    workspaces = await db
      .select({
        id: tenants.id,
        slug: tenants.slug,
        name: tenants.name,
      })
      .from(tenants)
      .orderBy(asc(tenants.name))
  } else {
    workspaces = await db
      .select({
        id: tenants.id,
        slug: tenants.slug,
        name: tenants.name,
      })
      .from(tenants)
      .innerJoin(tenantMembers, eq(tenants.id, tenantMembers.tenantId))
      .where(eq(tenantMembers.userId, session.userId))
      .orderBy(asc(tenants.name))
  }

  // 2. Fetch pending invitations for this user
  const pendingInvites = await db
    .select({
      id: invitations.id,
      role: invitations.role,
      tenantId: tenants.id,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
    })
    .from(invitations)
    .innerJoin(tenants, eq(invitations.tenantId, tenants.id))
    .where(and(
      eq(invitations.email, user.email.toLowerCase().trim()),
      eq(invitations.status, 'PENDING')
    ))

  // 3. Redirection logic
  // Only redirect to request-role if they have NO workspaces AND NO pending invites
  if (workspaces.length === 0 && pendingInvites.length === 0) {
    redirect('/request-role')
  }

  // Only auto-redirect to their workspace if they have EXACTLY 1 workspace and 0 invites
  if (workspaces.length === 1 && pendingInvites.length === 0) {
    redirect(workspaceOrigin(workspaces[0].slug))
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-16 selection:bg-indigo-100">
      <div className="mx-auto max-w-xl space-y-12">
        
        {/* Header Section */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-2 bg-indigo-50 rounded-2xl mb-4">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Select Workspace
          </h1>
          <p className="text-slate-500 font-medium">
            Welcome back. Choose an environment to continue.
          </p>
        </header>

        {/* Platform Administration Link for Superadmins */}
        {superAdmin && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-2 mb-4 px-1">
              <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-500">
                Administration
              </h2>
            </div>
            <Link
              href="/platform/tenants"
              className="group flex items-center justify-between overflow-hidden rounded-2xl border-2 border-indigo-100 bg-indigo-50/30 p-5 text-indigo-900 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-sm">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold">Platform Dashboard</p>
                  <p className="text-xs text-indigo-600/70 font-medium">Manage all workspaces and system settings</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </section>
        )}

        {/* Pending Invitations Section */}
        {pendingInvites.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-2 mb-4 px-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Invitations Received
              </h2>
            </div>
            <ul className="space-y-4">
              {pendingInvites.map((invite) => (
                <li key={invite.id} className="group relative overflow-hidden rounded-2xl border border-amber-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-amber-300">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <svg className="w-12 h-12 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                  <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-bold text-slate-900 leading-tight">
                        {invite.tenantName}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                          {invite.role === 'PRO' ? 'Pro Access' : 'Admin Access'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">Pending acceptance</span>
                      </div>
                    </div>
                    <div className="sm:shrink-0">
                      <AcceptInviteButton invitationId={invite.id} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Workspaces Section */}
        <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex items-center gap-2 mb-4 px-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Your Workspaces
            </h2>
          </div>
          <ul className="space-y-3">
            {workspaces.map((t) => (
              <li key={t.id}>
                <a
                  href={workspaceOrigin(t.slug)}
                  className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm transition-all hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-lg font-bold group-hover:text-indigo-600 transition-colors leading-tight">
                        {t.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-[11px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded leading-none border border-slate-100 capitalize">
                          {t.slug}
                        </code>
                      </div>
                    </div>
                    <div className="p-2 rounded-full bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </a>
              </li>
            ))}
            {workspaces.length === 0 && (
              <li className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center">
                <div className="inline-flex p-3 rounded-full bg-slate-100 mb-4">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-900">No active workspaces</p>
                <p className="mt-1 text-xs text-slate-500 max-w-[200px] mx-auto">
                  You haven&apos;t joined any environments yet.
                </p>
              </li>
            )}
          </ul>
        </section>

      </div>
    </main>
  )
}
