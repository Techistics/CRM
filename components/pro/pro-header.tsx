'use client'

import { UserButton } from '@clerk/nextjs'
import { Menu, Search } from 'lucide-react'
import NotificationBell from '@/app/components/NotificationBell'
import { useSidebar } from '@/components/sidebar-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ProHeader() {
  const { toggle } = useSidebar()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center gap-4 px-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggle}
          type="button"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open Menu</span>
        </Button>

        <div className="min-w-0 flex-1">
          <div className="relative mx-auto max-w-xl">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full pl-8 md:max-w-xl"
              aria-label="Search"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell portalBase="pro" />
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'h-8 w-8',
              },
            }}
          />
        </div>
      </div>
    </header>
  )
}
