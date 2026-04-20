'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { acceptInviteAction } from '@/app/actions/invitations'
import { Check, Loader2 } from 'lucide-react'

export function AcceptInviteButton({ invitationId }: { invitationId: string }) {
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
          // Brief delay to show success state before redirecting
          setTimeout(() => {
            router.push(res.redirectPath)
          }, 1000)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to accept invitation')
      }
    })
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 font-bold text-sm animate-in zoom-in duration-300">
        <div className="bg-emerald-500 p-1 rounded-full">
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </div>
        Joined Workspace
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button 
        onClick={handleAccept} 
        disabled={isPending}
        className="relative group transition-all active:scale-[0.95] bg-slate-900 hover:bg-indigo-600 text-white font-bold rounded-xl px-6 py-2 h-auto shadow-md hover:shadow-indigo-500/20"
      >
        <span className="flex items-center gap-2">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> 
              Propagating...
            </>
          ) : (
            <>
              Accept <span className="hidden sm:inline">Invitation</span>
            </>
          )}
        </span>
      </Button>
      {error && <p className="text-[10px] font-bold text-destructive text-center">{error}</p>}
    </div>
  )
}
