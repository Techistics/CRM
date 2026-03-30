import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserRole } from '../../lib/role'
import { ProHeader } from '@/components/pro/pro-header'
import { SidebarProvider } from '@/components/sidebar-provider'
import { RoleSidebar } from '@/components/shared/role-sidebar'
import { UiScaleWrapper } from '@/components/shared/ui-scale-wrapper'

export default async function ProLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getUserRole()

  // If not pro, kick back to root — let root page.tsx decide where to go
  if (role !== 'pro') redirect('/')

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-muted/50">
        <RoleSidebar role="pro" />
        <div className="flex min-h-screen flex-col lg:pl-52">
          <ProHeader />
          <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-8 md:py-8">
            <UiScaleWrapper>{children}</UiScaleWrapper>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}