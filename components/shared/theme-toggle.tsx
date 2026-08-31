'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const THEME_KEY = 'crm-theme'
type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

function getThemeFromDom(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY)
    const initial: Theme =
      stored === 'dark' || stored === 'light'
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'

    applyTheme(initial)
    setTimeout(() => {
      setTheme(initial)
      setMounted(true)
    }, 0)

    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_KEY) return
      const next = event.newValue === 'dark' ? 'dark' : 'light'
      applyTheme(next)
      setTheme(next)
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toggleTheme = () => {
    const current = mounted ? getThemeFromDom() : theme
    const nextTheme: Theme = current === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    applyTheme(nextTheme)
    localStorage.setItem(THEME_KEY, nextTheme)
  }

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={mounted ? `Switch to ${isDark ? 'light' : 'dark'} mode` : 'Toggle theme'}
      aria-pressed={isDark}
      className={cn(
        'relative inline-flex h-9 w-16 items-center rounded-full p-1 outline-none transition-all',
        'focus-visible:ring-2 focus-visible:ring-consulty-primary/60',
        isDark
          ? 'bg-consulty-surface-raised dark:bg-consulty-surface-subtle'
          : 'bg-consulty-primary/80',
      )}
    >
      <span
        className={cn(
          'absolute inset-y-1 left-1 flex h-7 w-7 items-center justify-center rounded-full bg-consulty-surface shadow-consulty-sm transition-transform duration-300',
          isDark ? 'translate-x-7' : 'translate-x-0',
        )}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-consulty-primary" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-consulty-warning" />
        )}
      </span>
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}

/** Alias for assignment compatibility */
export { ThemeToggle as ThemeSwitch }
