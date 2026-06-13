'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Label } from '@/components/ui/label'
import { apiCall } from '@/lib/utils/api-handler'

function PlatformSignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get('redirect') || '/platform/tenants'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const data = await apiCall(async () => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, isSuperAdminLogin: true }),
      })
      return res.json()
    }, {
      errorMsg: 'Login failed',
      onError: (err) => setError(err instanceof Error ? err.message : 'Login failed'),
    })
    setLoading(false)
    if (data) {
  const payload = (data as any)?.data ?? data
  if (payload?.user?.globalRole === 'SUPER_ADMIN') {
    window.location.href = redirectPath
  } else {
    setError('Access denied. Super Admin only.')
  }
}

  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-8 shadow-crm-md">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Platform Admin</h1>
        <p className="text-sm text-slate-500 mt-1">Super Admin access only</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="name@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)} required
            className="h-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-500" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="h-10 bg-white border-slate-200 text-slate-900 focus:border-sky-500" />
        </div>
        {error && <p className="text-[12px] font-medium text-red-500">{error}</p>}
        <Button type="submit" className="w-full h-10 font-medium bg-sky-500 hover:bg-sky-600 text-white" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
        </Button>
      </form>
    </div>
  )
}

export default function PlatformSignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
      <Suspense fallback={<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}>
        <PlatformSignInForm />
      </Suspense>
    </main>
  )
}
