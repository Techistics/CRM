'use client'

import { useState, useTransition } from 'react'
import { hardDeleteWorkspaceAction } from '@/app/platform/actions'
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

export function HardDeleteTenantButton({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('tenantId', tenantId)
        await hardDeleteWorkspaceAction(formData)
        toast.success('Workspace permanently deleted')
        setOpen(false)
      } catch (err) {
        toast.error('Failed to permanently delete workspace')
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="rounded-[8px] border-[0.5px] border-[rgba(226,75,74,0.3)] bg-transparent px-3 py-1.5 text-[12px] text-[#E24B4A] transition-colors hover:bg-red-50"
        >
          Permanent Delete
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permanently delete workspace?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently erase the workspace and ALL of its associated data (leads, users, settings). This action CANNOT be undone!
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex h-10 items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isPending ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
