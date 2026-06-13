'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function AcceptInviteInner() {
  const search = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const token = search.get('token')
    const highlight = search.get('highlight')

    if (!token) {
      router.replace('/')
      return
    }

    fetch(`/api/invite/accept?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const tenantSlug = data.tenantSlug ?? highlight
          const target = tenantSlug ? `/t/${tenantSlug}` : '/'
          router.replace(target)
        } else {
          router.replace('/')
        }
      })
      .catch(() => {
        router.replace('/')
      })
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