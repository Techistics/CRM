'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Label } from '@/components/ui/label'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') || ''

  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync email search param to state on mount
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail)
    }
  }, [initialEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Login failed')
      }

      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Welcome back to Edu CRM
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
          />
        </div>

        {error && (
          <p className="text-sm font-medium text-destructive">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link 
          href={`/sign-up${email ? `?email=${encodeURIComponent(email)}` : ''}`} 
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/50 px-4">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
        <SignInForm />
      </Suspense>
    </main>
  )
}
