import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { roleRequests } from '@/db/schema'
import { requireTenantFromApiHeaders } from '@/lib/tenant-api'
import { resolveTenantAccess } from '@/lib/tenant-access'
import { normalizeAppRole } from '@/lib/role'
import { getSession } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const t = await requireTenantFromApiHeaders()
  if (!t.ok) return t.response

  const actor = await resolveTenantAccess(t.tenant)
  if (actor) {
    return NextResponse.json(
      { error: 'You already have access to this workspace' },
      { status: 400 },
    )
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

  const [existingPending] = await db
    .select()
    .from(roleRequests)
    .where(
      and(
        eq(roleRequests.userId, session.userId),
        eq(roleRequests.status, 'pending'),
        eq(roleRequests.tenantId, t.tenant.id),
      ),
    )
    .limit(1)

  if (existingPending) {
    return NextResponse.json(
      { error: 'You already have a pending request' },
      { status: 400 },
    )
  }

  await db.insert(roleRequests).values({
  tenantId: t.tenant.id,
  userId: session.userId,
  email: session.email,
  name: session.name,
  requestedRole: requested as 'tenant_admin' | 'agent',
  status: 'pending',
})

  return NextResponse.json({ ok: true })
}