'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, XCircle, ShieldCheck, UserPlus, Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { apiCall } from '@/lib/utils/api-handler'

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteData, setInviteData] = useState<{
    email: string
    role: string
    workspaceName: string
    tenantSlug: string
    inviterName: string
  } | null>(null)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('No invitation token found in URL.')
      setLoading(false)
      return
    }

    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invite/accept?token=${token}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'This invitation link is invalid or has expired.')
        } else {
          setInviteData(data.data)
        }
      } catch {
        setError('Failed to load invitation details.')
      } finally {
        setLoading(false)
      }
    }

    void fetchInvite()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setSubmitting(true)
    const result = await apiCall(async () => {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Failed to create account')
      }
      return json.data
    }, {
      successMsg: 'Account created successfully!',
    })

    if (result?.tenantSlug) {
      const base = `/t/${result.tenantSlug}`
      window.location.href = result.role === 'ADMIN' ? `${base}/admin/overview` : `${base}/pro/overview`
    } else {
      router.push('/sign-in')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading invitation...</p>
      </div>
    )
  }

  if (error || !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <Card className="max-w-md w-full shadow-lg border-destructive/20 bg-card">
          <CardHeader className="text-center pb-2">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Invalid Invitation</CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              {error || 'This invitation link has expired or already been used.'}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2 pt-4">
            <Button className="w-full" onClick={() => router.push('/sign-in')}>
              Go to Sign In
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => router.push('/')}>
              Back to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4 py-12">
      <div className="max-w-md w-full space-y-6">
        
        {/* Workspace Intro Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-4 ring-4 ring-primary/5">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to {inviteData.workspaceName}</h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto">
            {inviteData.inviterName} has invited you to join as an{' '}
            <span className="font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md text-xs uppercase tracking-wider">
              {inviteData.role === 'ADMIN' ? 'Admin' : 'Counselor'}
            </span>.
          </p>
        </div>

        {/* Dynamic Form Card */}
        <Card className="shadow-xl border-border bg-card overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/60">
            <CardTitle className="text-lg">Create your account</CardTitle>
            <CardDescription>Enter your details to join the workspace.</CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-6">
              
              {/* Email (Read-only status style) */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Email Address</Label>
                <Input 
                  id="email" 
                  value={inviteData.email} 
                  disabled 
                  className="bg-muted/60 border-border/80 text-muted-foreground opacity-80 cursor-not-allowed select-none" 
                />
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="John Doe" 
                  required 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  className="focus-visible:ring-primary"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    className="pr-10 focus-visible:ring-primary"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={submitting}
                    className="pr-10 focus-visible:ring-primary"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirm(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

            </CardContent>

            <CardFooter className="flex flex-col gap-4 pb-6">
              <Button type="submit" className="w-full h-11 text-primary-foreground font-medium" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Create account & join workspace
              </Button>
              <p className="text-center text-xs text-muted-foreground px-4 text-balance leading-relaxed">
                By joining, you agree to the terms and conditions of {inviteData.workspaceName}.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  const [hasSession, setHasSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setHasSession(!!data.session);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
        <AcceptInviteContent />
    </Suspense>
  );
}