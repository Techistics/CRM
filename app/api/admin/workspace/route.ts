import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { tenants } from '@/db/schema'
import { requireTenantAdminSession } from '@/lib/tenant-server'

export async function PATCH(req: Request) {
  try {
    const { tenant } = await requireTenantAdminSession()
    const body = await req.json()
    const { name, logoUrl } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Merge existing settings with new logoUrl
    const currentSettings = (tenant.settings as Record<string, unknown>) || {}
    const updatedSettings = {
      ...currentSettings,
      logoUrl: logoUrl || currentSettings.logoUrl,
    }

    await db
      .update(tenants)
      .set({
        name,
        settings: updatedSettings,
      })
      .where(eq(tenants.id, tenant.id))

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Failed to update workspace settings:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
