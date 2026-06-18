'use client'
import { useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, ShieldCheck, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Label } from '@/components/ui/label'

// ── helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), 
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(json?.error ?? 'Request failed')
  }
  return (json?.data ?? json) as Record<string, unknown>
}

// ── Step components ───────────────────────────────────────────────────────────

function PasswordStep({
  onRequiresMfa,
  onRequiresSetup,
}: {
  onRequiresMfa: (mfaToken: string) => void
  onRequiresSetup: (setupSecret: string, mfaToken: string) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch('/api/auth/login', {
        email,
        password,
        isSuperAdminLogin: true,
      })

      if (data.requiresMfa && typeof data.mfaToken === 'string') {
        onRequiresMfa(data.mfaToken)
      } else if (data.requiresMfaSetup && typeof data.setupSecret === 'string' && typeof data.mfaToken === 'string') {
        onRequiresSetup(data.setupSecret, data.mfaToken)
      } else {
        setError('Unexpected response from server.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Platform Admin</h1>
        <p className="text-sm text-slate-500 mt-1">Super Admin access only</p>
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
            className="h-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-10 bg-white border-slate-200 text-slate-900 focus:border-sky-500"
          />
        </div>
        {error && <p className="text-[12px] font-medium text-red-500">{error}</p>}
        <Button
          type="submit"
          className="w-full h-10 font-medium bg-sky-500 hover:bg-sky-600 text-white"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
        </Button>
      </form>
    </>
  )
}

function MfaStep({
  mfaToken,
  redirectPath,
}: {
  mfaToken: string
  redirectPath: string
}) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await apiFetch('/api/auth/verify-mfa', { mfaToken, code })
      window.location.href = redirectPath
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      setLoading(false)
    }
  }

  return (
    <>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-100">
          <ShieldCheck className="h-6 w-6 text-sky-500" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Two-factor authentication</h1>
        <p className="text-sm text-slate-500 mt-1">Enter the 6-digit code from your authenticator app</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mfa-code">Authenticator code</Label>
          <Input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
            autoFocus
            className="h-10 bg-white border-slate-200 text-slate-900 text-center tracking-[0.3em] text-lg font-mono placeholder:text-slate-400 focus:border-sky-500"
          />
        </div>
        {error && <p className="text-[12px] font-medium text-red-500">{error}</p>}
        <Button
          type="submit"
          className="w-full h-10 font-medium bg-sky-500 hover:bg-sky-600 text-white"
          disabled={loading || code.length !== 6}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
        </Button>
      </form>
    </>
  )
}

function SetupStep({
  setupSecret,
  mfaToken,
  redirectPath,
}: {
  setupSecret: string
  mfaToken: string
  redirectPath: string
}) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const secretRef = useRef<HTMLElement>(null)

  const copySecret = () => {
    navigator.clipboard.writeText(setupSecret).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await apiFetch('/api/auth/confirm-mfa-setup', { mfaToken, code })
      window.location.href = redirectPath
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
      setLoading(false)
    }
  }

  return (
    <>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-100">
          <KeyRound className="h-6 w-6 text-sky-500" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Set up two-factor authentication</h1>
        <p className="text-sm text-slate-500 mt-1">This only happens once — future logins will just ask for your code</p>
      </div>

      <div className="mb-5 rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">
          Enter this key in Google Authenticator or Authy
        </p>
        <code
          ref={secretRef}
          className="block break-all rounded-lg bg-white border border-slate-200 px-3 py-2.5 font-mono text-[13px] text-slate-800 select-all"
        >
          {setupSecret}
        </code>
        <button
          type="button"
          onClick={copySecret}
          className="text-[12px] font-medium text-sky-500 hover:text-sky-600 transition-colors"
        >
          {copied ? '✓ Copied!' : 'Copy key'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="setup-code">Confirm with a 6-digit code</Label>
          <Input
            id="setup-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
            autoFocus
            className="h-10 bg-white border-slate-200 text-slate-900 text-center tracking-[0.3em] text-lg font-mono placeholder:text-slate-400 focus:border-sky-500"
          />
        </div>
        {error && <p className="text-[12px] font-medium text-red-500">{error}</p>}
        <Button
          type="submit"
          className="w-full h-10 font-medium bg-sky-500 hover:bg-sky-600 text-white"
          disabled={loading || code.length !== 6}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Activate 2FA & Sign In'}
        </Button>
      </form>
    </>
  )
}

// ── State machine wrapper ─────────────────────────────────────────────────────

type Step =
  | { name: 'password' }
  | { name: 'mfa'; mfaToken: string }
  | { name: 'setup'; setupSecret: string; mfaToken: string }

function PlatformSignInForm() {
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get('redirect') || '/platform/tenants'

  const [step, setStep] = useState<Step>({ name: 'password' })

  return (
    <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-8 shadow-crm-md">
      {step.name === 'password' && (
        <PasswordStep
          onRequiresMfa={(mfaToken) => setStep({ name: 'mfa', mfaToken })}
          onRequiresSetup={(setupSecret, mfaToken) => setStep({ name: 'setup', setupSecret, mfaToken })}
        />
      )}
      {step.name === 'mfa' && (
        <MfaStep mfaToken={step.mfaToken} redirectPath={redirectPath} />
      )}
      {step.name === 'setup' && (
        <SetupStep setupSecret={step.setupSecret} mfaToken={step.mfaToken} redirectPath={redirectPath} />
      )}
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
