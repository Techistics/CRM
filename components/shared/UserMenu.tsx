'use client'

import { useRouter } from 'next/navigation'
import { LogOut, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function UserMenu({ user }: { user: { name: string, email: string } | null }) {
  const router = useRouter()

  if (!user) return null

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/sign-in')
    router.refresh()
  }

  const initials = user.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative flex items-center gap-2 px-1 py-1.5 h-auto hover:bg-muted/50 rounded-full transition-colors group">
          <Avatar className="h-8 w-8 border-2 border-transparent group-hover:border-blue-500/20 transition-all shadow-sm">
            <AvatarImage src="" alt={user.name} />
            <AvatarFallback className="bg-blue-600 text-white text-[11px] font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-muted-foreground group-hover:text-[var(--text-strong)] hidden md:inline-block transition-colors pr-2">
            {user.name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-64 mt-2 p-1.5 rounded-[12px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] shadow-xl animate-in fade-in zoom-in-95" 
        align="end" 
        forceMount
      >
        <DropdownMenuLabel className="px-4 py-3">
          <div className="flex flex-col space-y-1">
            <p className="text-[13px] font-bold text-[var(--text-strong)]">My Account</p>
            <p className="text-[11px] font-medium text-[var(--muted-text)] truncate">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[var(--card-border-color)] mx-1" />
        <div className="p-1">
          <DropdownMenuItem 
            onClick={() => router.push('/profile')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[13px] font-medium text-[var(--text-main)] transition-colors focus:bg-[var(--foreground)]/5 focus:text-[var(--text-strong)] cursor-pointer"
          >
            <Settings className="h-4 w-4 opacity-60" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleLogout} 
            className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[13px] font-medium text-red-500 transition-colors focus:bg-red-500/10 focus:text-red-500 cursor-pointer mt-0.5"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
