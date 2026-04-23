'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { apiCall } from '@/lib/utils/api-handler'

export default function RoleRequestRowActions({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)

  async function act(decision: 'approve' | 'reject') {
    setBusy(decision)
    const data = await apiCall(async () => {
      const res = await fetch(`/api/admin/role-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
      return res.json()
    }, {
      successMsg: `Request ${decision}d`,
      errorMsg: 'Action failed',
    })
    setBusy(null)
    if (!data) return
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
        {busy === 'approve' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Approve'}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => act('reject')}
        className="rounded-lg border border-gray-600 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-800 disabled:opacity-50"
      >
        {busy === 'reject' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reject'}
      </button>
    </div>
  )
}
