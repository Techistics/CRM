import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function ProLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, sessionClaims } = await auth()
  if (!userId) redirect('/sign-in')

    const role = (sessionClaims?.metadata as { role?: string })?.role

    // If not pro, kick back to root — let root page.tsx decide where to go
    if (role !== 'pro') redirect('/')

  return (
    <div className="flex min-h-screen bg-gray-950">
      <aside className="w-64 border-r border-gray-800 bg-gray-900 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-white font-semibold text-lg">EduCRM</h1>
          <span className="text-xs text-purple-400 font-medium">Pro Portal</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { label: 'Overview', href: '/pro/overview' },
            { label: 'My Leads', href: '/pro/leads' },
            { label: 'Activity', href: '/pro/activity' },
            { label: 'Settings', href: '/pro/settings' },
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
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}