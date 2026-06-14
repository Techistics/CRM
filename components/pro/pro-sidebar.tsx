'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Kanban,
  BarChart3,
  LogOut,
  Settings,
  FileText, 
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const proNavItems = [
  { label: 'Overview', href: '/pro/overview', icon: LayoutDashboard },
  { label: 'My Leads', href: '/pro/leads', icon: Users },
  { label: 'Kanban Board', href: '/pro/kanban', icon: Kanban },
  { label: 'Analytics', href: '/pro/analytics', icon: BarChart3 },
  { label: 'Templates', href: '/pro/templates', icon: FileText },
  { label: 'Settings', href: '/pro/settings', icon: Settings },
]

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function ProSidebar() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <aside className="w-[var(--sidebar-width)] border-r border-slate-200 bg-white dark:bg-[#0b0f19] dark:border-slate-800 flex flex-col relative z-10 shrink-0">
      {/* Brand */}
      <div className="h-[60px] px-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            E
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate leading-none">Edu CRM</h1>
            <span className="text-[9px] uppercase tracking-wider text-brand font-semibold">
              Pro Portal
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {proNavItems.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors',
                active
                  ? 'font-semibold text-brand bg-brand-light dark:bg-brand/10'
                  : 'font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
              )}
            >
              <item.icon
                className={cn(
                  'h-[16px] w-[16px] shrink-0',
                  active ? 'text-brand' : 'text-slate-400',
                )}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-800 px-2 py-3">
        <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Pro Access
        </p>
        <button
          type="button"
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' })
            router.push('/sign-in')
            router.refresh()
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-[16px] w-[16px] shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
