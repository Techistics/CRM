import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { customRoles } from '@/db/schema'
import { requireRoleManagerApi } from '@/lib/tenant-api'
import { sanitizePermissions } from '@/lib/authz'
import { validateCustomRolePermissionsForActor } from '@/lib/team-access'

const roleBodySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).optional(),
})

const patchBodySchema = roleBodySchema.extend({
  id: z.string().uuid(),
})

export async function GET() {
  const ctx = await requireRoleManagerApi()
  if (!ctx.ok) return ctx.response

  const roles = await db
    .select()
    .from(customRoles)
    .where(eq(customRoles.tenantId, ctx.tenant.id))

  return NextResponse.json({
    data: roles
      .filter((role) => (
        ctx.role === 'ADMIN' ||
        (
          ctx.customRoleId !== role.id &&
          !validateCustomRolePermissionsForActor(
            ctx.role,
            ctx.permissions,
            sanitizePermissions(role.permissions),
          )
        )
      ))
      .map((r) => ({
        ...r,
        permissions: sanitizePermissions(r.permissions),
      })),
  })
}

export async function POST(req: NextRequest) {
  const ctx = await requireRoleManagerApi()
  if (!ctx.ok) return ctx.response

  const body = await req.json().catch(() => null)
  const parsed = roleBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid role payload' }, { status: 400 })
  }

  const { name, permissions } = parsed.data
  const sanitizedPermissions = sanitizePermissions(permissions ?? [])
  const permissionError = validateCustomRolePermissionsForActor(
    ctx.role,
    ctx.permissions,
    sanitizedPermissions,
  )
  if (permissionError) {
    return NextResponse.json({ error: permissionError }, { status: 403 })
  }

  const [role] = await db
    .insert(customRoles)
    .values({
      tenantId: ctx.tenant.id,
      name: name.trim(),
      permissions: sanitizedPermissions,
    })
    .returning()

  return NextResponse.json({ data: { ...role, permissions: sanitizePermissions(role.permissions) } }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireRoleManagerApi()
  if (!ctx.ok) return ctx.response

  const body = await req.json().catch(() => null)
  const parsed = patchBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid role payload' }, { status: 400 })
  }

  const { id, name, permissions } = parsed.data
  const [currentRole] = await db
    .select()
    .from(customRoles)
    .where(and(eq(customRoles.id, id), eq(customRoles.tenantId, ctx.tenant.id)))
    .limit(1)

  if (!currentRole) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  }

  if (ctx.role !== 'ADMIN') {
    if (ctx.customRoleId === id) {
      return NextResponse.json({ error: 'You cannot edit the role currently assigned to you' }, { status: 403 })
    }

    const currentPermissionsError = validateCustomRolePermissionsForActor(
      ctx.role,
      ctx.permissions,
      sanitizePermissions(currentRole.permissions),
    )
    if (currentPermissionsError) {
      return NextResponse.json(
        { error: 'You cannot edit a role that grants permissions you do not have' },
        { status: 403 },
      )
    }
  }

  const sanitizedPermissions = sanitizePermissions(permissions ?? [])
  const permissionError = validateCustomRolePermissionsForActor(
    ctx.role,
    ctx.permissions,
    sanitizedPermissions,
  )
  if (permissionError) {
    return NextResponse.json({ error: permissionError }, { status: 403 })
  }

  const [updated] = await db
    .update(customRoles)
    .set({
      name: name.trim(),
      permissions: sanitizedPermissions,
    })
    .where(and(eq(customRoles.id, id), eq(customRoles.tenantId, ctx.tenant.id)))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  }

  return NextResponse.json({ data: { ...updated, permissions: sanitizePermissions(updated.permissions) } })
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireRoleManagerApi()
  if (!ctx.ok) return ctx.response

  const body = await req.json().catch(() => null)
  const id = body?.id as string | undefined
  if (!id) return NextResponse.json({ error: 'Role id required' }, { status: 400 })

  const [role] = await db
    .select()
    .from(customRoles)
    .where(and(eq(customRoles.id, id), eq(customRoles.tenantId, ctx.tenant.id)))
    .limit(1)

  if (!role && ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  }

  if (role && ctx.role !== 'ADMIN') {
    if (ctx.customRoleId === id) {
      return NextResponse.json({ error: 'You cannot delete the role currently assigned to you' }, { status: 403 })
    }
    const permissionError = validateCustomRolePermissionsForActor(
      ctx.role,
      ctx.permissions,
      sanitizePermissions(role.permissions),
    )
    if (permissionError) {
      return NextResponse.json(
        { error: 'You cannot delete a role that grants permissions you do not have' },
        { status: 403 },
      )
    }
  }

  await db
    .delete(customRoles)
    .where(and(eq(customRoles.id, id), eq(customRoles.tenantId, ctx.tenant.id)))

  return NextResponse.json({ data: { success: true } })
}
