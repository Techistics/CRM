"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

import type { SidebarContextType } from '@/types/components'

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let lastWidth = window.innerWidth
    const handleResize = () => {
      if (window.innerWidth < 1024 && lastWidth >= 1024) {
        setIsOpen(false)
      }
      lastWidth = window.innerWidth
    }

    if (window.innerWidth < 1024) {
      setIsOpen(false)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggle = () => {
    setIsOpen(!isOpen)
  }

  return <SidebarContext.Provider value={{ isOpen, toggle }}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

