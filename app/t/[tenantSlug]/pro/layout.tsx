import { SidebarProvider } from '@/components/sidebar-provider'
import { RoleSidebar } from '@/components/shared/role-sidebar'
import { ProHeader } from '@/components/pro/pro-header'
import { UiScaleWrapper } from '@/components/shared/ui-scale-wrapper'
import { redirect } from 'next/navigation'
import { requireTenantSession } from '@/lib/tenant-server'

export default async function ProLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { tenant, user, role, permissions, customRoleName } = await requireTenantSession()

  // ADMIN members must not access /pro — redirect them to /admin
  if (role === 'ADMIN') {
    redirect(`/t/${tenant.slug}/admin/overview`)
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-page dark:bg-[#020617]">
        <RoleSidebar role={role} tenant={tenant} permissions={permissions} />
        <div className="flex min-h-screen min-w-0 flex-col lg:pl-[var(--sidebar-width)]">
          <ProHeader tenant={tenant} user={user} customRoleName={customRoleName} />
          <main className="crm-page w-full min-w-0 flex-1 overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <UiScaleWrapper>{children}</UiScaleWrapper>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
