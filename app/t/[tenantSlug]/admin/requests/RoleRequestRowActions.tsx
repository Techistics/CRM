'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RoleRequestRowActions({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)

  async function act(decision: 'approve' | 'reject') {
    setBusy(decision)
    const res = await fetch(`/api/admin/role-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    })
    setBusy(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(typeof data.error === 'string' ? data.error : 'Action failed')
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => act('approve')}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {busy === 'approve' ? '…' : 'Approve'}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => act('reject')}
        className="rounded-lg border border-gray-600 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-800 disabled:opacity-50"
      >
        {busy === 'reject' ? '…' : 'Reject'}
      </button>
    </div>
  )
}
