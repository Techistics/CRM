import { redirect } from 'next/navigation'
import { asc, eq, and } from 'drizzle-orm'

import { db } from '@/db'
import { tenants, tenantMembers, invitations } from '@/db/schema'
import { isPlatformSuperAdmin } from '@/lib/platform-role'
import { workspaceOrigin } from '@/lib/public-url'
import { getSession } from '@/lib/auth'
import { AcceptInviteButton } from '@/components/invitations/AcceptInviteButton'
import Link from 'next/link'
import Image from 'next/image'
import { crmConfig } from '@/lib/config/theme'

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

  function getInitials(name: string) {
    const chunks = name.trim().split(/\s+/).filter(Boolean)
    if (chunks.length === 0) return 'WS'
    if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase()
    return `${chunks[0][0]}${chunks[1][0]}`.toUpperCase()
  }

  return (
    <main className="min-h-screen bg-[#0a0c10] px-4 py-14">
      <div className="mx-auto max-w-[760px] space-y-8">
        <header className="space-y-2 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(203,239,127,0.12)]">
            <Image src={crmConfig.brand.logo} alt={crmConfig.brand.name} width={48} height={48} />
          </div>
          <h1 className="text-[24px] font-medium text-white">Select workspace</h1>
          <p className="text-[14px] text-white/45">Choose an environment to continue</p>
        </header>

        {superAdmin && (
          <section className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.07em] text-white/30">Admin access</p>
            <Link
              href="/platform/tenants"
              className="group flex items-center justify-between rounded-[10px] border-[0.5px] border-[rgba(203,239,127,0.2)] bg-[rgba(203,239,127,0.06)] px-5 py-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(203,239,127,0.15)]">
                  <svg className="h-5 w-5 text-[#CBEF7F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-medium text-white">Platform Dashboard</p>
                  <p className="text-[12px] text-white/45">Manage all workspaces and system settings</p>
                </div>
              </div>
              <svg className="h-5 w-5 text-[#CBEF7F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </section>
        )}

        {pendingInvites.length > 0 && (
          <section className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.07em] text-white/30">Pending invites</p>
            <ul className="space-y-2">
              {pendingInvites.map((invite) => (
                <li
                  key={invite.id}
                  className="rounded-[10px] border-[0.5px] border-white/10 bg-[#161b22] px-5 py-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[14px] font-medium text-white">{invite.tenantName}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center rounded-[4px] bg-white/5 px-2 py-0.5 text-[11px] text-white/45">
                          {invite.role === 'PRO' ? 'Pro Access' : 'Admin Access'}
                        </span>
                        <span className="text-[11px] text-white/35">Pending acceptance</span>
                      </div>
                    </div>
                    <div className="sm:shrink-0 [&>div>button]:h-9 [&>div>button]:rounded-[8px] [&>div>button]:border-[0.5px] [&>div>button]:border-white/10 [&>div>button]:bg-[#0f1117] [&>div>button]:px-3 [&>div>button]:py-1 [&>div>button]:text-[12px] [&>div>button]:font-medium [&>div>button]:text-white [&>div>button]:shadow-none [&>div>button:hover]:bg-white/5">
                      <AcceptInviteButton invitationId={invite.id} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.07em] text-white/30">Your workspaces</p>
          <ul className="space-y-2">
            {workspaces.map((t) => (
              <li key={t.id}>
                <a
                  href={workspaceOrigin(t.slug)}
                  className="group flex items-center justify-between rounded-[10px] border-[0.5px] border-white/10 bg-[#161b22] px-5 py-4 transition-colors hover:border-white/20 hover:bg-[#1a2030]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(203,239,127,0.12)] text-[14px] font-medium text-[#CBEF7F]">
                      {getInitials(t.name)}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-white">{t.name}</p>
                      <p className="text-[12px] text-white/40">{t.slug}</p>
                    </div>
                  </div>
                  <svg className="h-5 w-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </li>
            ))}
            {workspaces.length === 0 && (
              <li className="rounded-[10px] border-[0.5px] border-dashed border-white/15 bg-[#161b22] px-6 py-8 text-center">
                <p className="text-[13px] text-white/45">No active workspaces</p>
              </li>
            )}
          </ul>
        </section>
      </div>
    </main>
  )
}
