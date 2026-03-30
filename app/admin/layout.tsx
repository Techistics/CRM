import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { count, eq } from 'drizzle-orm'

import { db } from '@/db'
import { users } from '@/db/schema'
import { getUserRole } from '@/lib/role'
import { SidebarProvider } from '@/components/sidebar-provider'
import { RoleSidebar } from '@/components/shared/role-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'
import { UiScaleWrapper } from '@/components/shared/ui-scale-wrapper'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) redirect('/sign-in')

  const role = await getUserRole()
  if (role !== 'admin') redirect('/')

  const [teamRow] = await db
    .select({ c: count() })
    .from(users)
    .where(eq(users.role, 'pro'))

  const teamBadge =
    teamRow && Number(teamRow.c) > 0 ? String(Number(teamRow.c)) : '0'

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-muted/50">
        <RoleSidebar role="admin" badges={{ team: teamBadge }} />
        <div className="flex min-h-screen flex-col lg:pl-52">
          <AdminHeader />
          <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-8 md:py-8">
            <UiScaleWrapper>{children}</UiScaleWrapper>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
