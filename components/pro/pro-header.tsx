'use client'

import { useMemo, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { UserMenu } from '@/components/shared/UserMenu'
import { Menu, Search, Square } from 'lucide-react'
import NotificationBell from '@/app/components/NotificationBell'
import { useSidebar } from '@/components/sidebar-provider'
import { Button } from '@/components/ui/button'
// import { ThemeToggle } from '@/components/shared/theme-toggle'

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

  if (loading && !activeSession) return (
    <div className="flex items-center gap-1.5 h-8 px-12 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" />
    </div>
  )

  return (
    <div className="flex items-center gap-2">
      {activeSession ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-50 dark:bg-red-500/10 px-2 py-1">
          <span className="text-xs font-semibold tracking-tight text-red-600 animate-pulse">{duration}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePunchOut}
            disabled={loading}
            className="h-6 w-6 rounded-md bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
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
          className="h-8 rounded-lg border border-emerald-500/40 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/20 transition-all gap-1.5"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
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
    <header className="sticky top-0 z-40 h-[60px] bg-white dark:bg-[#0b0f19] border-b border-slate-200 dark:border-slate-800">
      <div className="flex h-full items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors lg:hidden"
            onClick={toggle}
            type="button"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open Menu</span>
          </Button>

          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {pageTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">

          <div className="flex items-center gap-2">
            <TimesheetPunchBar />
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
            {/* <ThemeToggle /> */}
            <NotificationBell tenantSlug={tenant.slug} portalBase="pro" />
            <UserMenu user={user} role="PRO" tenantSlug={tenant.slug} />
          </div>
        </div>
      </div>
    </header>
  )
}
