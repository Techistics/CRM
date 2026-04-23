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
      <div className="min-h-screen bg-[var(--main-bg)]">
        <RoleSidebar role="ADMIN" tenantSlug={tenant.slug} badges={{ team: teamBadge }} />
        <div className="flex min-h-screen flex-col lg:pl-[var(--sidebar-width)]">
          <AdminHeader tenantSlug={tenant.slug} />
          <main className="w-full flex-1 px-5 py-[18px]">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
