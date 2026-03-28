'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useEffect, Suspense } from 'react'

function SearchInputInner({ placeholder = "Search..." }: { placeholder?: string }) {
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
      params.set('page', '1') // Reset to page 1 on search
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
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
      </div>
    </div>
  )
}

export default function SearchInput({ placeholder }: { placeholder?: string }) {
  return (
    <Suspense fallback={<div className="w-64 h-9 bg-gray-800 rounded-lg animate-pulse"></div>}>
      <SearchInputInner placeholder={placeholder} />
    </Suspense>
  )
}
