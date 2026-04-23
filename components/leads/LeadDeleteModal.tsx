'use client'

import { useState, useCallback } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LeadDeleteModalProps {
  leadId: string
  leadName: string
  trigger: React.ReactNode
  onDeleted?: () => void
}

interface DeletePreviewCounts {
  activities: number
  reminders: number
  documents: number
  checklistItems: number
  total: number
}

export function LeadDeleteModal({
  leadId,
  leadName,
  trigger,
  onDeleted,
}: LeadDeleteModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [counts, setCounts] = useState<DeletePreviewCounts | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchPreview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/leads/${leadId}/delete-preview`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch impact preview')
      }
      setCounts(data.data.counts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [leadId])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen) {
      void fetchPreview()
    } else {
      // Reset state when closing
      setCounts(null)
      setConfirmText('')
      setError(null)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete lead')
      }
      toast.success('Lead deleted successfully')
      setOpen(false)
      onDeleted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Lead
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Checking impact...</p>
          </div>
        ) : error ? (
          <div className="py-4 text-sm text-destructive">{error}</div>
        ) : counts ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Permanently delete{' '}
              <span className="font-semibold text-foreground">{leadName}</span>?
            </p>

            {counts.total > 0 && (
              <div className="rounded-lg border bg-destructive/5 border-destructive/20 p-4 space-y-2">
                <p className="text-sm font-medium text-destructive">
                  This will also permanently delete:
                </p>
                <ul className="space-y-1">
                  {counts.activities > 0 && (
                    <li className="text-sm flex items-center gap-2 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive/60 flex-shrink-0" />
                      {counts.activities} activit
                      {counts.activities === 1 ? 'y' : 'ies'}
                    </li>
                  )}
                  {counts.reminders > 0 && (
                    <li className="text-sm flex items-center gap-2 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive/60 flex-shrink-0" />
                      {counts.reminders} reminder
                      {counts.reminders === 1 ? '' : 's'}
                    </li>
                  )}
                  {counts.documents > 0 && (
                    <li className="text-sm flex items-center gap-2 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive/60 flex-shrink-0" />
                      {counts.documents} document
                      {counts.documents === 1 ? '' : 's'}
                    </li>
                  )}
                  {counts.checklistItems > 0 && (
                    <li className="text-sm flex items-center gap-2 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive/60 flex-shrink-0" />
                      {counts.checklistItems} checklist item
                      {counts.checklistItems === 1 ? '' : 's'}
                    </li>
                  )}
                </ul>
                <p className="text-xs text-muted-foreground pt-1">
                  This cannot be undone.
                </p>
              </div>
            )}

            {counts.total > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm">
                  Type <span className="font-semibold">{leadName}</span> to
                  confirm
                </Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={leadName}
                  className="font-medium"
                />
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={
              deleting ||
              loading ||
              !counts ||
              (counts.total > 0 && confirmText !== leadName)
            }
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Lead'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
