import { count, eq, and, isNull } from 'drizzle-orm'
import { headers } from 'next/headers'

import { db } from '@/db'
import { tenantMembers, pipelineStages } from '@/db/schema'
import { UiScaleWrapper } from '@/components/shared/ui-scale-wrapper'
import { SidebarProvider } from '@/components/sidebar-provider'
import { RoleSidebar } from '@/components/shared/role-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'
import { requireTenantAdminSession } from '@/lib/tenant-server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { tenant, user, role, permissions } = await requireTenantAdminSession()

  const [teamRow] = await db
    .select({ c: count() })
    .from(tenantMembers)
    .where(
      and(
        eq(tenantMembers.tenantId, tenant.id),
        eq(tenantMembers.role, 'PRO'),
        isNull(tenantMembers.deletedAt)
      ),
    )

  const teamBadge =
    teamRow && Number(teamRow.c) > 0 ? String(Number(teamRow.c)) : '0'

  const [stagesRow] = await db
    .select({ c: count() })
    .from(pipelineStages)
    .where(eq(pipelineStages.tenantId, tenant.id))

  const needsSetup = Number(stagesRow?.c ?? 0) === 0

  const h = await headers()
  const pathname = h.get('x-pathname') ?? ''
  const isOnSetup = pathname.includes('/setup')

  if (needsSetup && !isOnSetup) {
    redirect(`/t/${tenant.slug}/admin/setup/pipeline`)
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-consulty-canvas dark:bg-consulty-canvas">
        <RoleSidebar role={role} tenant={tenant} permissions={permissions} badges={{ team: teamBadge }} />
        <div className="flex min-h-screen min-w-0 flex-col lg:pl-[var(--sidebar-width)]">
          <AdminHeader user={user} tenantSlug={tenant.slug} />
          <main className="crm-page w-full min-w-0 flex-1 overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <UiScaleWrapper>
              {children}
            </UiScaleWrapper>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}