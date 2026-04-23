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
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to accept invitation')
      }
    })
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 rounded-[8px] border-[0.5px] border-white/10 bg-[#0f1117] px-3 py-2 text-[12px] text-white/70">
        <div className="rounded-full bg-[rgba(203,239,127,0.2)] p-1">
          <Check className="h-3 w-3 text-[#CBEF7F]" strokeWidth={2} />
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
        className="h-9 rounded-[8px] border-[0.5px] border-white/10 bg-[#0f1117] px-3 py-1 text-[12px] font-medium text-white hover:bg-white/5"
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
      {error && <p className="text-center text-[10px] text-[#E24B4A]">{error}</p>}
    </div>
  )
}
