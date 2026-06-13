import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { customRoles } from '@/db/schema'
import { requireTenantAdminApi } from '@/lib/tenant-api'
import { sanitizePermissions, ALL_PERMISSIONS, type Permission } from '@/lib/authz'

const permissionSchema = z.enum(ALL_PERMISSIONS)

const roleBodySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(permissionSchema).optional(),
})

const patchBodySchema = roleBodySchema.extend({
  id: z.string().uuid(),
})

export async function GET() {
  const ctx = await requireTenantAdminApi()
  if (!ctx.ok) return ctx.response

  const roles = await db
    .select()
    .from(customRoles)
    .where(eq(customRoles.tenantId, ctx.tenant.id))

  return NextResponse.json({
    data: roles.map((r) => ({
      ...r,
      permissions: sanitizePermissions(r.permissions),
    })),
  })
}

export async function POST(req: NextRequest) {
  const ctx = await requireTenantAdminApi()
  if (!ctx.ok) return ctx.response

  const body = await req.json().catch(() => null)
  const parsed = roleBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid role payload' }, { status: 400 })
  }

  const { name, permissions } = parsed.data
  const [role] = await db
    .insert(customRoles)
    .values({
      tenantId: ctx.tenant.id,
      name: name.trim(),
      permissions: sanitizePermissions(permissions ?? []),
    })
    .returning()

  return NextResponse.json({ data: { ...role, permissions: sanitizePermissions(role.permissions) } }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireTenantAdminApi()
  if (!ctx.ok) return ctx.response

  const body = await req.json().catch(() => null)
  const parsed = patchBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid role payload' }, { status: 400 })
  }

  const { id, name, permissions } = parsed.data
  const [updated] = await db
    .update(customRoles)
    .set({
      name: name.trim(),
      permissions: sanitizePermissions(permissions ?? []),
    })
    .where(and(eq(customRoles.id, id), eq(customRoles.tenantId, ctx.tenant.id)))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  }

  return NextResponse.json({ data: { ...updated, permissions: sanitizePermissions(updated.permissions) } })
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireTenantAdminApi()
  if (!ctx.ok) return ctx.response

  const body = await req.json().catch(() => null)
  const id = body?.id as string | undefined
  if (!id) return NextResponse.json({ error: 'Role id required' }, { status: 400 })

  await db
    .delete(customRoles)
    .where(and(eq(customRoles.id, id), eq(customRoles.tenantId, ctx.tenant.id)))

  return NextResponse.json({ data: { success: true } })
}
