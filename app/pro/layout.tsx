import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserRole } from '../../lib/role'
import { ProHeader } from '@/components/pro/pro-header'
import { ProSidebar } from '@/components/pro/pro-sidebar'

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
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <ProSidebar />

      <main className="flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden">
        <ProHeader />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}