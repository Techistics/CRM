'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Kanban,
  BarChart3,
  LogOut,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const proNavItems = [
  { label: 'Overview', href: '/pro/overview', icon: LayoutDashboard },
  { label: 'My Leads', href: '/pro/leads', icon: Users },
  { label: 'Kanban Board', href: '/pro/kanban', icon: Kanban },
  { label: 'Analytics', href: '/pro/analytics', icon: BarChart3 },
]

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function ProSidebar() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <aside className="w-52 border-r border-gray-200 bg-white flex flex-col shadow-sm relative z-10 shrink-0">
      {/* Brand */}
      <div className="h-14 px-4 border-b border-gray-100 bg-white flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
            E
          </div>
          <div>
            <h1 className="text-gray-900 font-bold text-base leading-none">Edu CRM</h1>
            <span className="text-[9px] uppercase tracking-wider text-blue-600 font-bold">
              Pro Portal
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {proNavItems.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-100',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 px-2 py-3">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Pro Access
        </p>
        <button
          type="button"
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' })
            router.push('/sign-in')
            router.refresh()
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-gray-500 text-sm font-medium transition-colors hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
