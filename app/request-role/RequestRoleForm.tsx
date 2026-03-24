'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AppRole } from '@/lib/role'

export default function RequestRoleForm({
  lastRejected,
}: {
  lastRejected: boolean
}) {
  const router = useRouter()
  const [role, setRole] = useState<AppRole>('pro')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/role-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestedRole: role }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Something went wrong')
      return
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {lastRejected && (
        <p className="text-amber-400/90 text-sm rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          Your previous request was declined. You can submit a new one below.
        </p>
      )}
      <div>
        <label htmlFor="requested-role" className="block text-sm text-gray-400 mb-1.5">
          Requested role
        </label>
        <select
          id="requested-role"
          value={role}
          onChange={(e) => setRole(e.target.value as AppRole)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
        >
          <option value="pro">Pro — manage assigned leads</option>
          <option value="admin">Admin — full CRM access</option>
        </select>
        <p className="text-gray-600 text-xs mt-1.5">
          An administrator must approve this. You will not get access until then.
        </p>
      </div>
      {error && (
        <p className="text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  )
}
