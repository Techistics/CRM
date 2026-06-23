'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { apiCall } from '@/lib/utils/api-handler'

type ImportBatch = {
  id: string
  fileName: string | null
  totalRows: number | null
  importedRows: number | null
  skippedRows: number | null
  status: string | null
  createdAt: string | Date | null
  importedByName: string | null
}

export function ImportBatchHistory({ canDelete }: { canDelete: boolean }) {
  const [batches, setBatches] = useState<ImportBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const loadBatches = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/leads/import/batches')
      const json = await res.json()
      if (res.ok) {
        setBatches(json.data?.batches ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBatches()
  }, [loadBatches])

  async function deleteSelected() {
    if (selected.size === 0) return
    setDeleting(true)
    const data = await apiCall(async () => {
      const res = await fetch('/api/leads/import/batches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchIds: Array.from(selected) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Delete failed')
      return json.data
    }, {
      successMsg: 'Import batch deleted',
      errorMsg: 'Could not delete import batch',
    })
    setDeleting(false)
    setConfirmOpen(false)
    if (data) {
      setSelected(new Set())
      await loadBatches()
    }
  }

  if (loading) {
    return (
      <Card className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading import history…
      </Card>
    )
  }

  if (batches.length === 0) return null

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#223955]">Recent Imports</h2>
          <p className="text-sm text-muted-foreground">
            Delete leads from a specific import batch. This removes all leads created in that import.
          </p>
        </div>
        {canDelete && selected.size > 0 && (
          <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)} disabled={deleting}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete selected ({selected.size})
          </Button>
        )}
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              {canDelete && <th className="p-2 w-10" />}
              <th className="p-2 text-left">File</th>
              <th className="p-2 text-left">Imported</th>
              <th className="p-2 text-left">Skipped</th>
              <th className="p-2 text-left">By</th>
              <th className="p-2 text-left">Date</th>
              {canDelete && <th className="p-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id} className="border-b last:border-b-0">
                {canDelete && (
                  <td className="p-2">
                    <Checkbox
                      checked={selected.has(batch.id)}
                      onCheckedChange={(checked) => {
                        setSelected((prev) => {
                          const next = new Set(prev)
                          if (checked) next.add(batch.id)
                          else next.delete(batch.id)
                          return next
                        })
                      }}
                    />
                  </td>
                )}
                <td className="p-2">{batch.fileName ?? 'Import'}</td>
                <td className="p-2">{batch.importedRows ?? 0}</td>
                <td className="p-2">{batch.skippedRows ?? 0}</td>
                <td className="p-2">{batch.importedByName ?? '—'}</td>
                <td className="p-2">
                  {batch.createdAt ? new Date(batch.createdAt).toLocaleString() : '—'}
                </td>
                {canDelete && (
                  <td className="p-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      disabled={deleting}
                      onClick={() => {
                        setSelected(new Set([batch.id]))
                        setConfirmOpen(true)
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete imported leads?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes all leads from the selected import batch(es) and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-500"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault()
                void deleteSelected()
              }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
