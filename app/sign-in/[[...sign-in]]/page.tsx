'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Label } from '@/components/ui/label'
import { apiCall } from '@/lib/utils/api-handler'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') || ''
  const token = searchParams.get('token') || ''
  const redirectPath = searchParams.get('redirect') || ''

  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
const [workspaces, setWorkspaces] = useState<{tenantSlug: string, tenantId: string, role: string, name: string}[]>([])
const [showPicker, setShowPicker] = useState(false)
  
  // Sync email search param to state on mount
  useEffect(() => {
    if (initialEmail) {
      setTimeout(() => {
        setEmail(initialEmail)
      }, 0)
    }
  }, [initialEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const data = await apiCall(async () => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      return res.json()
    }, {
      successMsg: 'Signed in successfully',
      errorMsg: 'Login failed',
      onError: (err) => setError(err instanceof Error ? err.message : 'Login failed'),
    })
    if (data) {
  const payload = (data as any)?.data ?? data
  if (payload.tenantSlug && payload.role) {
    const base = `/t/${payload.tenantSlug}`
    window.location.href = payload.role === 'ADMIN' ? `${base}/admin/overview` : `${base}/pro/overview`
  } else if (payload.workspaces?.length > 1) {
    setWorkspaces(payload.workspaces)
    setShowPicker(true)
  } else {
    window.location.href = '/'
  }
}
    setLoading(false)
  }

  const authQueryParams = new URLSearchParams()
  if (email) authQueryParams.set('email', email)
  if (token) authQueryParams.set('invite_token', token)
  if (redirectPath) authQueryParams.set('redirect', redirectPath)
  const authQueryString = authQueryParams.toString()

  return (
    <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-8 shadow-crm-md">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-semibold text-black">Sign In</h1>
        <p className="text-sm text-black mt-1">
          Welcome back to Consulty
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-sky-500/20"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link 
              href="/forgot-password" 
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-10 bg-transparent border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-500"
          />
        </div>

        {error && (
          <p className="mt-1 text-[12px] font-medium text-[var(--danger)]">{error}</p>
        )}


        <Button type="submit" className="w-full h-10 font-medium" style={{ backgroundColor: '#0ea5e9', color: 'white' }} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link 
          href={`/sign-up${authQueryString ? `?${authQueryString}` : ''}`} 
          className="font-medium text-primary hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  )
}

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
      <Suspense fallback={<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}>
        <SignInForm />
      </Suspense>
    </main>
  )
}
