'use client'

import { useState, useTransition } from 'react'
import { restoreWorkspaceAction } from '@/app/platform/actions'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function RestoreTenantButton({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleRestore = () => {
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('tenantId', tenantId)
        await restoreWorkspaceAction(formData)
        toast.success('Workspace restored successfully')
        setOpen(false)
      } catch {
        toast.error('Failed to restore workspace')
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="rounded-[8px] border-[0.5px] border-[rgba(44,80,0,0.3)] bg-transparent px-3 py-1.5 text-[12px] text-[#2C5000] transition-colors hover:bg-[#0DA2E7]/20"
        >
          Restore
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore workspace?</AlertDialogTitle>
          <AlertDialogDescription>
            This will restore the workspace and make it visible and accessible to users again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <button
            onClick={handleRestore}
            disabled={isPending}
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#0DA2E7] px-4 py-2 text-sm font-medium text-[#2C5000] transition-colors hover:bg-[#b0d85a] disabled:opacity-50"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isPending ? 'Restoring...' : 'Restore'}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
