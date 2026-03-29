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

    // On state change transitions
    if (prevIsSignedIn.current !== undefined) {
      if (prevIsSignedIn.current === false && isSignedIn === true) {
        toast({
          title: 'Logged In Successfully',
          description: user?.firstName 
            ? `Welcome back, ${user.firstName}!` 
            : 'Welcome back!',
        })
      } else if (prevIsSignedIn.current === true && isSignedIn === false) {
        toast({
          title: 'Logged Out',
          description: 'You have been successfully logged out.',
        })
      }
    }

    prevIsSignedIn.current = isSignedIn
  }, [isSignedIn, isLoaded, user, toast])

  return null
}
