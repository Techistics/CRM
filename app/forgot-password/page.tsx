'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordReset } from '@/app/actions/auth'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import { apiCall } from '@/lib/utils/api-handler'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await apiCall(async () => requestPasswordReset(email), {
      successMsg: 'Reset link sent',
      errorMsg: 'Something went wrong',
      onError: (err) => setError(err instanceof Error ? err.message : 'Something went wrong'),
    })
    if (result?.success) setSuccess(true)
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        {success ? (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <MailCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We&apos;ve sent a password reset link to <strong>{email}</strong>.
            </p>
            <Button asChild className="w-full">
              <Link href="/sign-in">Return to Sign In</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold">Forgot Password</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="mt-1 text-[12px] font-medium text-[var(--danger)]">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/sign-in"
                className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
