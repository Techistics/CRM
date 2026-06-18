'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, UserPlus } from 'lucide-react'
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

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Array<{ tenantSlug: string; tenantId: string; role: string; name: string }>>([]);
  const [selected, setSelected] = useState<string>('');
  
  // Sync email search param to state on mount
  useEffect(() => {
    if (initialEmail) {
      setTimeout(() => {
        setEmail(initialEmail)
      }, 0)
    }
  }, [initialEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const data = await apiCall(async () => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Login failed');
      }
      return json;
    }, {
      successMsg: 'Signed in successfully',
      errorMsg: 'Login failed',
      onError: (err) => setError(err instanceof Error ? err.message : 'Login failed'),
    });
    if (data) {
      const payload = (data as any)?.data ?? data;
      if (payload.workspaces && payload.workspaces.length > 0) {
        setWorkspaces(payload.workspaces);
        setLoading(false);
        return; // Show picker
      }
      if (payload.tenantSlug && payload.role) {
        const base = `/t/${payload.tenantSlug}`;
        window.location.href = payload.role === 'ADMIN' ? `${base}/admin/overview` : `${base}/pro/overview`;
      } else {
        window.location.href = '/';
      }
    }
    setLoading(false);
  };

  const selectWorkspace = async () => {
    if (!selected) return setError('Please select a workspace');
    setLoading(true);
    const res = await apiCall(async () => {
      const r = await fetch('/api/auth/select-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: selected }),
      });
      const json = await r.json();
      if (!r.ok || !json.ok) {
        throw new Error(json.error || 'Selection failed');
      }
      return json;
    }, {
      successMsg: 'Workspace selected',
      errorMsg: 'Selection failed',
      onError: (err) => setError(err instanceof Error ? err.message : 'Selection failed'),
    });
    if (res) {
      const payload = (res as any)?.data ?? res;
      if (payload.tenantSlug && payload.role) {
        const base = `/t/${payload.tenantSlug}`;
        window.location.href = payload.role === 'ADMIN' ? `${base}/admin/overview` : `${base}/pro/overview`;
      }
    }
    setLoading(false);
  };

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
        {workspaces.length === 0 && (
          <>
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
          </>
        )}

        {error && (
          <p className="mt-1 text-[12px] font-medium text-[var(--danger)]">{error}</p>
        )}

        {/* If multiple workspaces returned, show picker */}
        {workspaces.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">Select a workspace to continue:</p>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="" disabled>Select workspace</option>
              {workspaces.map((ws) => (
                <option key={ws.tenantId} value={ws.tenantId}>
                  {ws.name} ({ws.role})
                </option>
              ))}
            </select>
            <Button
              type="button"
              className="w-full h-10 font-medium"
              style={{ backgroundColor: '#0ea5e9', color: 'white' }}
              disabled={loading}
              onClick={selectWorkspace}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Continue'}
            </Button>
          </div>
        )}
        
        {/* Original login form when no workspace picker */}
        {workspaces.length === 0 && (
          <Button type="submit" className="w-full h-10 font-medium" style={{ backgroundColor: '#0ea5e9', color: 'white' }} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Sign In
          </Button>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link 
            href={`/sign-up${authQueryString ? `?${authQueryString}` : ''}`} 
            className="font-medium text-primary hover:underline"
          >
            Create one
          </Link>
        </p>
      </form>
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
