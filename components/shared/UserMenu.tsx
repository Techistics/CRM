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
import { Badge } from '@/components/ui/badge'

export function UserMenu({ user, role, tenantSlug }: { user: { name: string, email: string } | null, role?: string, tenantSlug?: string }) {
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
    <div className="flex items-center gap-2">
      {role && (
        <Badge 
          variant="outline" 
          className={`cursor-pointer font-bold tracking-wider text-[10px] px-2 py-0.5 ${
            role.toUpperCase() === 'ADMIN'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]'
              : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.3)] hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]'
          } transition-all duration-300`}
        >
          {role.toUpperCase()}
        </Badge>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative flex items-center gap-2 px-1 py-1.5 h-auto hover:bg-muted/50 rounded-full transition-colors group">
            <Avatar className="h-8 w-8 ring-1 ring-slate-300 dark:ring-slate-600 transition-all">
              <AvatarImage src="" alt={user.name} />
              <AvatarFallback className="bg-slate-700 dark:bg-brand text-white text-[11px] font-bold">
    {initials}
  </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-[var(--text-strong)] hidden md:inline-block transition-colors pr-2">
              {user.name && user.name.includes('@') ? user.name.split('@')[0] : user.name}
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
            <p className="text-[13px] font-bold text-[var(--text-strong)]">
              {user.name && user.name.includes('@') ? user.name.split('@')[0] : user.name}
            </p>
            <p className="text-[11px] font-medium text-[var(--muted-text)] truncate">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[var(--card-border-color)] mx-1" />
        <div className="p-1">
          <DropdownMenuItem 
            onClick={() => {
  const isAdmin = role?.toUpperCase() === 'ADMIN' || role?.toUpperCase() === 'SUPER_ADMIN'
  const path = isAdmin
    ? `/t/${tenantSlug}/admin/settings/general`
    : `/t/${tenantSlug}/pro/settings`
  router.push(path)
}}
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
    </div>
  )
}
