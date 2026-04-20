'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { acceptInviteAction } from '@/app/actions/invitations'
import { Loader2, CheckCircle2, Building2, ShieldCheck } from 'lucide-react'

type AcceptInviteLandingProps = {
  invitationId: string
  tenantName: string
  email: string
  role: string | null
}

export function AcceptInviteLanding({
  invitationId,
  tenantName,
  email,
  role
}: AcceptInviteLandingProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleAccept = async () => {
    setError(null)
    startTransition(async () => {
      try {
        const res = await acceptInviteAction(invitationId)
        if (res.success) {
          setSuccess(true)
          setTimeout(() => {
            router.push(res.redirectPath)
          }, 2000)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to accept invitation')
      }
    })
  }

  if (success) {
    return (
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-2xl text-center animate-in zoom-in-95 duration-500">
        <div className="mx-auto w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" strokeWidth={3} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Welcome Aboard!</h1>
        <p className="text-slate-500 font-medium">You have successfully joined <strong>{tenantName}</strong>.</p>
        <div className="mt-8">
           <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
           <p className="text-xs text-slate-400 mt-2 font-medium uppercase tracking-widest">Redirecting to Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg rounded-3xl bg-white p-10 shadow-2xl border border-slate-100 overflow-hidden relative group transition-all duration-700 hover:shadow-indigo-500/5">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-indigo-50 rounded-full group-hover:scale-150 transition-transform duration-1000 opacity-50" />
      
      <div className="relative">
        <header className="text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-6">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Workspace Invitation
          </h1>
          <p className="mt-2 text-slate-500 font-medium leading-relaxed">
            You&apos;ve been invited to join the <strong>{tenantName}</strong> environment.
          </p>
        </header>

        <div className="space-y-6">
          <div className="rounded-2xl bg-slate-50 p-6 flex items-start gap-4 border border-slate-100">
            <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-snug">Access Granted</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed italic">
                You will have <strong>{role === 'ADMIN' ? 'Administrator' : 'Pro Agent'}</strong> privileges in this workspace.
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-4">
            <Button 
              size="lg" 
              onClick={handleAccept} 
              disabled={isPending}
              className="h-14 rounded-2xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/20 active:scale-[0.98] transition-all"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Accepting...
                </>
              ) : (
                'Accept & Join Workspace'
              )}
            </Button>

            <div className="flex items-center justify-center gap-3 mt-2">
              <p className="text-sm text-slate-400 font-medium">Logged in as {email}</p>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="text-sm text-indigo-600 font-bold hover:underline">
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 border border-red-100 p-4 animate-in slide-in-from-top-2">
            <p className="text-sm font-bold text-red-600 text-center">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
