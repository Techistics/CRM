import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { invitations, users, tenants } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { eq, sql } from 'drizzle-orm'
import { AcceptInviteLanding } from './AcceptInviteLanding'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Accept Invitation | Edu CRM',
}

export default async function AcceptInvitePage(props: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await props.searchParams

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600">This invitation link is missing a token.</p>
        </div>
      </div>
    )
  }

  // 1. Fetch Invitation
  const [invite] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1)

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Invitation Not Found</h1>
          <p className="text-gray-600">This link may be invalid or has been revoked.</p>
        </div>
      </div>
    )
  }

  // 2. Check Expiry and Status
  const isExpired = new Date() > invite.expiresAt
  if (invite.status !== 'PENDING' || isExpired) {
    if (isExpired && invite.status === 'PENDING') {
        // Mark as expired in DB
        await db.update(invitations).set({ status: 'EXPIRED' }).where(eq(invitations.id, invite.id))
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
          <h1 className="text-2xl font-bold text-orange-600 mb-2">Link Expired</h1>
          <p className="text-gray-600">
            {invite.status === 'ACCEPTED' 
              ? 'This invitation has already been accepted.' 
              : 'This invitation has expired. Please ask the administrator to resend it.'}
          </p>
          <Link href="/sign-in" className="mt-6 inline-block text-blue-600 hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  // 3. Auth Check
  const session = await getSession()
  if (!session) {
    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${invite.email.toLowerCase()}`)
      .limit(1)

    const redirectPath = encodeURIComponent(`/accept-invite?token=${token}`)
    
    if (existingUser) {
      // User exists, take them to sign-in
      return redirect(`/sign-in?email=${encodeURIComponent(invite.email)}&token=${token}&redirect=${redirectPath}`)
    } else {
      // New user, take them to sign-up
      return redirect(`/sign-up?email=${encodeURIComponent(invite.email)}&invite_token=${token}&redirect=${redirectPath}`)
    }
  }

  // 4. Verify Email Binding
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
  if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Email Mismatch</h1>
          <p className="text-gray-600 mb-4">
            This invitation was sent to <strong>{invite.email}</strong>, but you are logged in as <strong>{user?.email}</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-6">Please log out and sign in with the correct account.</p>
          <form action="/api/auth/logout" method="POST">
             <button type="submit" className="text-blue-600 hover:underline">Log Out</button>
          </form>
        </div>
      </div>
    )
  }

  // 5. Success! Render Landing Page instead of auto-joining
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, invite.tenantId)).limit(1)
  if (!tenant) return redirect('/')

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-6">
      <AcceptInviteLanding 
        invitationId={invite.id}
        tenantName={tenant.name}
        email={user.email}
        role={invite.role}
      />
    </div>
  )
}
