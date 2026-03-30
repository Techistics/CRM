'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'

const DEFAULT_SCALE = 0.67
const KANBAN_SCALE = 0.78

function getScaleForPath(pathname: string | null) {
  if (!pathname) return DEFAULT_SCALE
  if (pathname.startsWith('/admin/kanban') || pathname.startsWith('/pro/kanban')) {
    return KANBAN_SCALE
  }
  return DEFAULT_SCALE
}

export function UiScaleWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const scale = getScaleForPath(pathname)

  return (
    <div style={{ '--ui-scale': scale } as React.CSSProperties} className="ui-scale">
      {children}
    </div>
  )
}

