'use client'

import { useEffect, useState } from 'react'

/**
 * Theme-aware stage badge.
 *
 * Both `badgeClasses` and `mutedClasses` come from PIPELINE_STAGES constants —
 * they are static strings Tailwind picks up at build time from the constants file.
 * This client component selects the correct set at runtime based on the active theme.
 */
export function ProStageBadge({
  label,
  badgeClasses,
  mutedClasses,
}: {
  label: string
  badgeClasses: string
  mutedClasses: string
}) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const html = document.documentElement
    const check = () => setIsDark(html.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(html, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${
        isDark ? mutedClasses : badgeClasses
      }`}
    >
      {label}
    </span>
  )
}
