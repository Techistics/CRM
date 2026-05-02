'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

export function SubmitInviteButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 rounded-[8px] bg-[#CBEF7F] px-4 py-[7px] text-[13px] font-medium text-[#2C5000] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Send invite
    </button>
  )
}
