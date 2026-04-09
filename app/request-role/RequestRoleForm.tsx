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
        <p className="text-amber-800 text-sm rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:text-amber-200 dark:border-amber-900 dark:bg-amber-950/40">
          Your previous request was declined. You can submit a new one below.
        </p>
      )}
      <div>
        <label htmlFor="requested-role" className="block text-sm text-muted-foreground mb-1.5">
          Requested role
        </label>
        <select
          id="requested-role"
          value={role}
          onChange={(e) => setRole(e.target.value as AppRole)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="pro">Agent — manage assigned leads</option>
          <option value="admin">Admin — full workspace CRM</option>
        </select>
        <p className="text-muted-foreground text-xs mt-1.5">
          A workspace admin must approve you in Clerk (organization membership).
        </p>
      </div>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  )
}
