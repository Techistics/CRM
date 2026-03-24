import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { roleRequests } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { getUserRole, normalizeAppRole } from '@/lib/role'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (await getUserRole()) {
    return NextResponse.json({ error: 'You already have access' }, { status: 400 })
  }

  let body: { requestedRole?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const requested = normalizeAppRole(body.requestedRole)
  if (!requested) {
    return NextResponse.json({ error: 'Choose admin or pro' }, { status: 400 })
  }

  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses[0]?.emailAddress
  if (!email) {
    return NextResponse.json({ error: 'No email on account' }, { status: 400 })
  }

  const name =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') ||
    email.split('@')[0] ||
    'User'

  const [existingPending] = await db
    .select()
    .from(roleRequests)
    .where(and(eq(roleRequests.clerkId, userId), eq(roleRequests.status, 'pending')))
    .limit(1)

  if (existingPending) {
    return NextResponse.json({ error: 'You already have a pending request' }, { status: 400 })
  }

  await db.insert(roleRequests).values({
    clerkId: userId,
    email,
    name,
    requestedRole: requested,
    status: 'pending',
  })

  return NextResponse.json({ ok: true })
}
