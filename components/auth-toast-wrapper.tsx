'use client'

import { useEffect, useRef } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useToast } from '@/hooks/use-toast'

export function AuthToastWrapper() {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const { toast } = useToast()
  
  // Keep track of the previous signed-in state
  const prevIsSignedIn = useRef<boolean | undefined>(undefined)

  useEffect(() => {
    // Wait until Clerk resolves the initial state
    if (!isLoaded) return
    // Avoid duplicate toasts on fast remounts/navigations
    const key = 'auth-toast:last'
    const now = Date.now()
    const last = Number(sessionStorage.getItem(key) ?? '0')
    const recentlyToasted = Number.isFinite(last) && now - last < 3000

    // On state change transitions
    if (prevIsSignedIn.current !== undefined) {
      if (prevIsSignedIn.current === false && isSignedIn === true) {
        if (!recentlyToasted) {
          sessionStorage.setItem(key, String(now))
          toast({
            title: 'Signed in',
            description: user?.firstName
              ? `Welcome, ${user.firstName}.`
              : 'Welcome back.',
          })
        }
      } else if (prevIsSignedIn.current === true && isSignedIn === false) {
        if (!recentlyToasted) {
          sessionStorage.setItem(key, String(now))
          toast({
            title: 'Signed out',
            description: 'You have been signed out.',
          })
        }
      }
    }

    prevIsSignedIn.current = isSignedIn
  }, [isSignedIn, isLoaded, user, toast])

  return null
}
