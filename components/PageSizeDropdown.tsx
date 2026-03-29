'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export default function PageSizeDropdown({ currentSize }: { currentSize: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    params.set('pageSize', newSize)
    params.set('page', '1') // Reset to first page
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <select
      value={currentSize}
      onChange={handleSizeChange}
      className="bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:border-blue-400 focus:ring-blue-500 focus:border-blue-500 block py-2 px-3 cursor-pointer outline-none shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all"
    >
      <option value="10">10</option>
      <option value="20">20</option>
      <option value="50">50</option>
      <option value="100">100</option>
    </select>
  )
}
