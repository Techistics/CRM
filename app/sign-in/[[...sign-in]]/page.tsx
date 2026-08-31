'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Mail, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Label } from '@/components/ui/label'
import { apiCall } from '@/lib/utils/api-handler'

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.21.81-.63z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 384 512" fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.2-46.5.6-89.9 27-114.7 69.6-49 84.8-12.5 211 35.1 280 23.2 33.4 50.4 70.7 86.3 69.4 34.4-1.3 47.4-22.3 89-22.3 41.5 0 53 22.3 88.5 21.6 36.5-.6 60.5-34.1 83.5-67.6 24.5-35.7 34.7-70.3 35.3-72.5-.7-.3-67.6-26-68.4-103.3zM254.3 65.5c19.6-23.7 32.9-56.6 29.3-89.5-28.1 1.1-62.1 18.9-82.4 42.6-18.2 21-34.1 54.8-29.8 87 31.1 2.4 62.9-15.8 82.9-40.1z"/>
    </svg>
  )
}

const testimonials = [
  {
    quote: "DevClyst built our CRM from scratch — it completely transformed how we manage students and track leads.",
    name: "Bilal Ahmed",
    role: "Study Abroad Consultancy",
  },
  {
    quote: "Fast delivery, clean code, and they truly understood our business needs from day one. Highly recommended.",
    name: "Sana Malik",
    role: "E-commerce Founder",
  },
  {
    quote: "Outstanding work. Our mobile app hit 5 stars on the Play Store within a month of launch.",
    name: "Usman Raza",
    role: "Logistics Startup",
  },
  {
    quote: "Professional team, on-time delivery, and the final product exceeded our expectations completely.",
    name: "Ayesha Tariq",
    role: "SaaS Founder",
  },
]

function TestimonialBelt() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonials.length)
    }, 2500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative mt-8 h-28 overflow-hidden border-l-2 border-white/30 pl-4">
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {testimonials.map((t) => (
          <div key={t.name} className="flex w-full shrink-0 flex-col justify-center pr-6">
            <div className="text-sm text-white/80">"{t.quote}"</div>
            <div className="mt-2 text-xs font-medium text-white/60">
              — {t.name}, {t.role}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SignInForm() {
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
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="mb-10 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#069BAF]">
          <MessageCircle className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-semibold text-slate-900">Consulty</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {workspaces.length === 0 && (
          <>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Welcome Back!</h1>
              <p className="mt-1 text-sm text-slate-500">
                Sign in to access your dashboard and manage your leads.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-white border-slate-200 pl-10 text-slate-900 placeholder:text-slate-400 focus:border-[#069BAF] focus:ring-[#069BAF]/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 bg-transparent border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#069BAF]"
              />
              {/* <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[#069BAF] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div> */}
            </div>
          </>
        )}

        {error && (
          <p className="text-[12px] font-medium text-red-500">{error}</p>
        )}

        {workspaces.length > 0 && (
          <div className="space-y-4">
            <div>
              <div className="text-2xl font-semibold text-[#069BAF]">Choose a workspace</div>
              <p className="mt-1 text-sm text-slate-500">Select where you'd like to continue.</p>
            </div>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full h-11 px-3 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:border-[#069BAF] focus:outline-none"
            >
              <option value="" className="text-[#069BAF] bg-white text-slate-900" disabled>Select workspace</option>
              {workspaces.map((ws) => (
                <option key={ws.tenantId} value={ws.tenantId} className="bg-white text-slate-900">
                  {ws.name} ({ws.role})
                </option>
              ))}
            </select>
            <Button
              type="button"
              className="w-full h-11 font-medium rounded-lg"
              style={{ backgroundColor: '#069BAF', color: 'white' }}
              disabled={loading}
              onClick={selectWorkspace}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Continue'}
            </Button>
          </div>
        )}

        {workspaces.length === 0 && (
          <Button
            type="submit"
            className="w-full h-11 font-medium rounded-lg"
            style={{ backgroundColor: '#069BAF', color: 'white' }}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
          </Button>
        )}

        {/* Hidden during workspace-picker stage */}
        {workspaces.length === 0 && (
          <p className="text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link
              href={`/sign-up${authQueryString ? `?${authQueryString}` : ''}`}
              className="font-medium text-[#069BAF] hover:underline"
            >
              Sign Up
            </Link>
          </p>
        )}
      </form>
    </div>
  )
}

export default function SignInPage() {
  return (
    <main className="flex h-screen w-full overflow-hidden">
      <div className="flex w-full flex-col items-center justify-center overflow-y-auto bg-white px-6 py-12 md:w-1/2">
        <Suspense fallback={<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}>
          <SignInForm />
        </Suspense>
      </div>

      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#27D097] p-12 text-white md:flex">
        <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 mt-auto mb-auto">
          <div className="text-3xl font-semibold leading-tight text-white">
            Run Your Study Abroad Consultancy on Autopilot
          </div>
          <TestimonialBelt />
        </div>

        <div className="relative z-10">
          <div className="mb-4 text-xs uppercase tracking-wider text-white font-bold">
            Exclusively Built for consultancies
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-white/80">
            <div className="rounded-full bg-white/10 px-3 py-1.5">Complete Lead Tracking</div>
            <div className="rounded-full bg-white/10 px-3 py-1.5">Quick Onboarding</div>
            <div className="rounded-full bg-white/10 px-3 py-1.5">Customizable Dashboard</div>
            <div className="rounded-full bg-white/10 px-3 py-1.5">Consultants Analytics</div>
          </div>
        </div>
      </div>
    </main>
  )
}