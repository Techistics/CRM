'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, XCircle, ShieldCheck, UserPlus } from 'lucide-react'

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
      router.push(`/t/${result.tenantSlug}`)
    } else {
      router.push('/sign-in')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error || !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full shadow-lg border-red-100">
          <CardHeader className="text-center pb-2">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-slate-900">Invalid Invitation</CardTitle>
            <CardDescription className="text-slate-500">
              {error || 'This invitation link has expired or already been used.'}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3 pt-6">
            <Button className="w-full" onClick={() => router.push('/sign-in')}>
              Go to Sign In
            </Button>
            <Button variant="ghost" className="w-full text-slate-500" onClick={() => router.push('/')}>
              Back to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-4">
             <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome to {inviteData.workspaceName}</h1>
          <p className="text-slate-500 mt-2">
            {inviteData.inviterName} has invited you to join as an <span className="font-semibold text-primary">{inviteData.role === 'ADMIN' ? 'Admin' : 'Agent'}</span>.
          </p>
        </div>

        <Card className="shadow-xl border-slate-200 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-lg">Create your account</CardTitle>
            <CardDescription>Enter your details to join the workspace.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">Email Address</Label>
                <Input id="email" value={inviteData.email} disabled className="bg-slate-50 text-slate-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="John Doe" 
                  required 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Min 8 characters" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input 
                  id="confirm" 
                  type="password" 
                  placeholder="Repeat your password" 
                  required 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pb-6">
              <Button type="submit" className="w-full h-11" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Create account & join workspace
              </Button>
              <p className="text-center text-xs text-slate-400 px-4">
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
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}
