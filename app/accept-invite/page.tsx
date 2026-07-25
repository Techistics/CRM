'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function AcceptInviteInner() {
  const search = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const token = search.get('token')

    if (!token) {
      router.replace('/')
      return
    }

    router.replace(`/invite/accept?token=${encodeURIComponent(token)}`)
  }, [search, router])

  return <p>Redirecting…</p>
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <AcceptInviteInner />
    </Suspense>
  )
}