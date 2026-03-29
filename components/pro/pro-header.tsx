'use client'

import { UserButton } from '@clerk/nextjs'
import { Search } from 'lucide-react'
import NotificationBell from '@/app/components/NotificationBell'

export function ProHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur px-8 py-3.5 flex items-center shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)]">
      <div className="min-w-0 flex-1 flex items-center">
        <div className="relative w-full max-w-lg">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search leads, activities..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all font-medium placeholder:text-gray-400 text-gray-900"
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4 ml-4">
        <NotificationBell portalBase="pro" />
        <div className="h-5 w-px bg-gray-200" />
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-8 w-8 shadow-sm border border-gray-200',
            },
          }}
        />
      </div>
    </header>
  )
}
