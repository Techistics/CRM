'use client'

import { useAuth, useOrganizationList } from '@clerk/nextjs'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Ensures Clerk active organization matches the subdomain workspace. */
export function TenantOrgSync({ clerkOrgId }: { clerkOrgId: string }) {
  const { orgId, isLoaded: authLoaded } = useAuth()
  const { setActive, isLoaded: listLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  })
  const router = useRouter()

  useEffect(() => {
    if (!authLoaded || !listLoaded || !setActive) return
    if (orgId === clerkOrgId) return
    void setActive({ organization: clerkOrgId }).then(() => router.refresh())
  }, [authLoaded, listLoaded, setActive, orgId, clerkOrgId, router])

  return null
}
