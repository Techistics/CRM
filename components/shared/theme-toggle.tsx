'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

const THEME_KEY = 'crm-theme'
type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
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
    
    // Defer state updates to avoid synchronous cascading renders warning
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

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={mounted ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode` : 'Toggle theme'}
      aria-pressed={theme === 'dark'}
      className="group relative inline-flex h-9 w-[74px] items-center rounded-full p-1 outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#CBEF7F]/60"
      style={{
        background:
          theme === 'dark'
            ? 'linear-gradient(180deg, #1f2535 0%, #111827 100%)'
            : 'linear-gradient(180deg, #8cb4f8 0%, #5f8fe8 100%)',
      }}
    >
      <span
        className={`absolute inset-y-1 left-1 h-7 w-7 rounded-full bg-[#f4f6fb] transition-transform duration-300 ${
          theme === 'dark' ? 'translate-x-[38px]' : 'translate-x-0'
        }`}
      />

      <span
        className={`pointer-events-none absolute right-6 top-[9px] h-1.5 w-1.5 rounded-full bg-white/80 transition-opacity ${
          theme === 'dark' ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <span
        className={`pointer-events-none absolute right-4 top-[17px] h-1 w-1 rounded-full bg-white/70 transition-opacity ${
          theme === 'dark' ? 'opacity-0' : 'opacity-100'
        }`}
      />

      <span
        className={`pointer-events-none absolute left-3 top-[9px] h-1 w-1 rounded-full bg-white/85 transition-opacity ${
          theme === 'dark' ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <span
        className={`pointer-events-none absolute left-5 top-[16px] h-1.5 w-1.5 rounded-full bg-white/70 transition-opacity ${
          theme === 'dark' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <span className="sr-only">Toggle theme</span>
      <span className="absolute left-2 top-2.5">
        {theme === 'dark' ? (
          <Moon className="h-3.5 w-3.5 text-white/0" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-white/0" />
        )}
      </span>
    </button>
  )
}
