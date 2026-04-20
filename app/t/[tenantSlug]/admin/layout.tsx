import { count, eq, and, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { tenantMembers } from '@/db/schema'
import { SidebarProvider } from '@/components/sidebar-provider'
import { RoleSidebar } from '@/components/shared/role-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'
import { UiScaleWrapper } from '@/components/shared/ui-scale-wrapper'
import { requireTenantAdminSession } from '@/lib/tenant-server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { tenant } = await requireTenantAdminSession()

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

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-slate-50/90 dark:bg-background">
        <RoleSidebar role="ADMIN" tenantSlug={tenant.slug} badges={{ team: teamBadge }} />
        <div className="flex min-h-screen flex-col lg:pl-52">
          <AdminHeader tenantSlug={tenant.slug} />
          <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-8 md:py-8">
            <UiScaleWrapper>{children}</UiScaleWrapper>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
