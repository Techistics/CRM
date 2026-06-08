import { count, eq, and, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { tenantMembers } from '@/db/schema'
import { SidebarProvider } from '@/components/sidebar-provider'
import { RoleSidebar } from '@/components/shared/role-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'
import { requireTenantAdminSession } from '@/lib/tenant-server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { tenant, user, role } = await requireTenantAdminSession()

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
      <div className="min-h-screen bg-page dark:bg-[#020617]">
        <RoleSidebar role={role} tenant={tenant} badges={{ team: teamBadge }} />
        <div className="flex min-h-screen min-w-0 flex-col lg:pl-[var(--sidebar-width)]">
          <AdminHeader user={user} tenantSlug={tenant.slug} />
          <main className="crm-page w-full min-w-0 flex-1 overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
