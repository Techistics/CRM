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

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') || ''
  const inviteToken = searchParams.get('invite_token') || searchParams.get('token') || ''
  const redirectPath = searchParams.get('redirect') || ''

  const [name, setName] = useState('')
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, invite_token: inviteToken }),
      })
      return res.json()
    }, {
      successMsg: 'Account created',
      errorMsg: 'Registration failed',
      onError: (err) => setError(err instanceof Error ? err.message : 'Registration failed'),
    })
    if (data) {
  const payload = (data as any)?.data ?? data
  if (payload.tenantSlug && payload.role) {
    const base = `/t/${payload.tenantSlug}`
    window.location.href = payload.role === 'ADMIN' ? `${base}/admin/overview` : `${base}/pro/overview`
  } else {
    router.push(redirectPath || '/')
  }
  router.refresh()
}
    setLoading(false)
  }

  const authQueryParams = new URLSearchParams()
  if (email) authQueryParams.set('email', email)
  if (inviteToken) authQueryParams.set('token', inviteToken)
  if (redirectPath) authQueryParams.set('redirect', redirectPath)
  const authQueryString = authQueryParams.toString()

  return (
    <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-8 shadow-crm-md">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Create Account</h1>
        <p className="text-sm text-slate-500 mt-1">
          Join the Consulty platform
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-sky-500/20"
          />
        </div>
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
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-500"
          />
        </div>

        {error && (
          <div>
            <p className="mt-1 text-[12px] font-medium text-[var(--danger)]">{error}</p>
            {error.includes('already exists') && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full border-destructive/20 text-destructive hover:bg-destructive/10"
                asChild
              >
                <Link href={`/sign-in${authQueryString ? `?${authQueryString}` : ''}`}>
                  Sign in with this email
                </Link>
              </Button>
            )}
          </div>
        )}

        <Button type="submit" className="w-full h-10 font-medium" style={{ backgroundColor: '#0ea5e9', color: 'white' }} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link 
          href={`/sign-in${authQueryString ? `?${authQueryString}` : ''}`} 
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
      <Suspense fallback={<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}>
        <SignUpForm />
      </Suspense>
    </main>
  )
}
