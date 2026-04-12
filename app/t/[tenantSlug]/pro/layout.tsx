import { SidebarProvider } from '@/components/sidebar-provider'
import { RoleSidebar } from '@/components/shared/role-sidebar'
import { ProHeader } from '@/components/pro/pro-header'
import { UiScaleWrapper } from '@/components/shared/ui-scale-wrapper'
import { requireTenantSession } from '@/lib/tenant-server'

export default async function ProLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { tenant } = await requireTenantSession()

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-muted/50">
        <RoleSidebar role="pro" tenantSlug={tenant.slug} />
        <div className="flex min-h-screen flex-col lg:pl-52">
          <ProHeader tenantSlug={tenant.slug} />
          <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-8 md:py-8">
            <UiScaleWrapper>{children}</UiScaleWrapper>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
