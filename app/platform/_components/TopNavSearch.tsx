'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useEffect, Suspense } from 'react'
import { Search } from 'lucide-react'

function TopNavSearchInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      return params.toString()
    },
    [searchParams]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== (searchParams.get('q') || '')) {
        router.push(`?${createQueryString('q', query)}`)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, createQueryString, router, searchParams])

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[var(--muted-text)]" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search"
        aria-label="Search"
        className="h-9 w-[180px] rounded-[8px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] pl-8 pr-3 text-[13px] text-[var(--text-strong)] outline-none placeholder:text-[var(--muted-text)]"
      />
    </div>
  )
}

export function TopNavSearch() {
  return (
    <Suspense fallback={<div className="h-9 w-[180px] rounded-[8px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] animate-pulse" />}>
      <TopNavSearchInner />
    </Suspense>
  )
}
