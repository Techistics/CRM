import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import NotificationBell from '@/components/NotificationBell'
import { getUserRole } from '@/lib/role'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) redirect('/sign-in')

  const role = await getUserRole()
  if (role !== 'admin') redirect('/')

  return (
    <div className="flex min-h-screen bg-gray-950">
      <aside className="w-64 border-r border-gray-800 bg-gray-900 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-white font-semibold text-lg">EduCRM</h1>
          <span className="text-xs text-emerald-400 font-medium">Admin Portal</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { label: 'Overview',  href: '/admin/overview' },
            { label: 'Leads',     href: '/admin/leads' },
            { label: 'Kanban',    href: '/admin/kanban' },
            { label: 'Access requests', href: '/admin/requests' },
            { label: 'Team',      href: '/admin/team' },
            { label: 'Import',    href: '/admin/import' },
            { label: 'Analytics', href: '/admin/analytics' },
            { label: 'Settings',  href: '/admin/settings' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-sm transition-colors"
            > 
              {item.label}
            </a>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <NotificationBell portalBase="admin" />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}