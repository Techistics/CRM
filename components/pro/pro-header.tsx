'use client'

import { useMemo, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { UserMenu } from '@/components/shared/UserMenu'
import { Menu, Search, Square } from 'lucide-react'
import NotificationBell from '@/app/components/NotificationBell'
import { useSidebar } from '@/components/sidebar-provider'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/theme-toggle'

import type { Tenant } from '@/types/models'

function TimesheetPunchBar() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeSession, setActiveSession] = useState<any>(null)
  const [duration, setDuration] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/timesheets/status')
      const data = await res.json()
      if (data.activeSession) {
        setActiveSession(data.activeSession)
      } else {
        setActiveSession(null)
      }
    } catch {
      setActiveSession(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  useEffect(() => {
    if (!activeSession) {
      setDuration('')
      return
    }

    const calcDuration = () => {
      const punchIn = new Date(activeSession.punchIn).getTime()
      const now = new Date().getTime()
      const diffSecs = Math.floor((now - punchIn) / 1000)
      const hrs = Math.floor(diffSecs / 3600)
      const mins = Math.floor((diffSecs % 3600) / 60)
      const secs = diffSecs % 60
      
      if (hrs > 0) {
        setDuration(`Clocked In: ${hrs}h ${mins.toString().padStart(2, '0')}m`)
      } else {
        setDuration(`Clocked In: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`)
      }
    }

    calcDuration()
    const interval = setInterval(calcDuration, 1000)
    return () => clearInterval(interval)
  }, [activeSession])

  const handlePunchIn = async () => {
    setLoading(true)
    await fetch('/api/timesheets/punch-in', { method: 'POST' })
    await fetchStatus()
  }

  const handlePunchOut = async () => {
    setLoading(true)
    await fetch('/api/timesheets/punch-out', { method: 'POST' })
    await fetchStatus()
  }

  if (loading && !activeSession) return <div className="h-8 w-24 animate-pulse rounded-full bg-[var(--card-border-color)]" />

  return (
    <div className="flex items-center gap-2">
      {activeSession ? (
        <div className="flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 py-1 pl-3 pr-1 shadow-sm">
          <span className="text-xs font-semibold tracking-tight text-red-600 animate-pulse">{duration}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePunchOut}
            disabled={loading}
            className="h-6 w-6 rounded-md bg-red-600 flex items-center justify-center text-white hover:bg-red-700 hover:text-white transition-colors ml-1"
            title="Punch Out"
          >
            <Square className="h-3 w-3 fill-white" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePunchIn}
          disabled={loading}
          className="h-8 rounded-full border-emerald-500/30 bg-emerald-50/50 px-4 text-xs font-semibold text-emerald-600 shadow-sm hover:bg-emerald-50 hover:text-emerald-700 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 transition-all"
        >
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Punch In
        </Button>
      )}
    </div>
  )
}

export function ProHeader({ 
  tenant, 
  user 
}: { 
  tenant: Tenant, 
  user: { name: string, email: string } 
}) {
  const { toggle } = useSidebar()

  const pathname = usePathname()

  const pageTitle = useMemo(() => {
    if (pathname.includes('/pro/overview')) return 'Dashboard'
    if (pathname.includes('/pro/leads')) return 'Leads'
    if (pathname.includes('/pro/calendar')) return 'Calendar'
    if (pathname.includes('/pro/tasks')) return 'Tasks'
    return 'Dashboard'
  }, [pathname])

  return (
    <header className="sticky top-0 z-40 h-[var(--topbar-height)] border-b-[0.5px] border-b-[var(--card-border-color)] bg-[var(--sidebar-bg)]/80 backdrop-blur-md transition-all">
      <div className="flex h-full min-w-0 items-center justify-between gap-2 px-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full lg:hidden"
            onClick={toggle}
            type="button"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open Menu</span>
          </Button>

          <div className="flex items-center gap-2">
            <h1 className="text-[14px] font-bold tracking-tight text-[var(--text-strong)]">
              {pageTitle}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-4">
          <div className="relative hidden w-full max-w-sm lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-text)]" />
            <input
              type="search"
              placeholder="Search leads or settings..."
              className="h-9 w-full rounded-full border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] pl-10 pr-4 text-[13px] font-medium text-[var(--text-strong)] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-color)]/50 placeholder:text-[var(--muted-text)]"
              aria-label="Search"
            />
          </div>

          <div className="flex items-center gap-3">
            <TimesheetPunchBar />
            <div className="h-4 w-[1px] bg-[var(--card-border-color)]" />
            <ThemeToggle />
            <NotificationBell tenantSlug={tenant.slug} portalBase="pro" />
            <UserMenu user={user} />
          </div>
        </div>
      </div>
    </header>
  )
}
