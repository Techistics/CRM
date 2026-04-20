'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Upload,
  ExternalLink,
  HardDrive,
  Trash2,
  Edit2,
  Check,
  X,
  RefreshCw,
  ClipboardCheck,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { LeadDocumentChecklistItem } from '@/types/models'

type DocRow = {
  id: string
  fileName: string
  mimeType: string | null
  sizeBytes: number | null
  storageUrl: string
  label: string | null
  createdAt: string | null
  uploaderName: string | null
}

function formatSize(n: number | null) {
  if (n == null) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function FileThumb({
  mimeType,
  className,
}: {
  mimeType: string | null
  className?: string
}) {
  const isImage = mimeType?.startsWith('image/')
  const Icon = isImage ? ImageIcon : FileText
  return (
    <div
      className={cn(
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] shadow-inner',
        className,
      )}
    >
      <Icon className="h-6 w-6 text-gray-400" />
    </div>
  )
}

export function LeadDocumentsPanel({ leadId }: { leadId: string }) {
  const { toast } = useToast()
  const [documents, setDocuments] = useState<DocRow[]>([])
  const [checklistItems, setChecklistItems] = useState<LeadDocumentChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingChecklist, setLoadingChecklist] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [label, setLabel] = useState('')
  const [file, setFile] = useState<File | null>(null)

  // Edit/Delete state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [, setDeletingId] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}/documents`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load documents')
      setDocuments(data.documents ?? [])
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Documents Load Error',
        description: e instanceof Error ? e.message : 'Storage sync failed.',
      })
    }
  }, [leadId, toast])

  const loadChecklist = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}/checklist`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load checklist')
      setChecklistItems(data.items ?? [])
    } catch (e) {
      console.error('Checklist Load Error:', e)
    }
  }, [leadId])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    setLoadingChecklist(true)
    await Promise.all([loadDocuments(), loadChecklist()])
    setLoading(false)
    setLoadingChecklist(false)
  }, [loadDocuments, loadChecklist])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  async function onUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      toast({ variant: 'destructive', title: 'Choose a file first' })
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (label.trim()) fd.append('label', label.trim())
      const res = await fetch(`/api/leads/${leadId}/documents`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Upload failed')
      }
      setFile(null)
      setLabel('')
      toast({
        title: 'File uploaded',
        description: data.document?.fileName ?? 'Saved.',
      })
      // Force immediate re-fetch
      await loadDocuments()
    } catch {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Check storage configuration.',
      })
    } finally {
      setUploading(false)
    }
  }

  async function onDelete(docId: string) {
    setDeletingId(docId)
    try {
      const res = await fetch(`/api/leads/${leadId}/documents/${docId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      toast({ title: 'Deleted', description: 'Document removed successfully.' })
      await loadDocuments()
    } catch {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: 'Please try again.',
      })
    } finally {
      setDeletingId(null)
    }
  }

  async function onRename(docId: string) {
    try {
      const res = await fetch(`/api/leads/${leadId}/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editLabel }),
      })
      if (!res.ok) throw new Error('Rename failed')
      toast({ title: 'Updated', description: 'Document label saved.' })
      await loadDocuments()
      setEditingId(null)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Rename failed',
        description: 'Please try again.',
      })
    }
  }

  async function toggleChecklistItem(itemId: string, nextSubmitted: boolean) {
    const res = await fetch(`/api/leads/${leadId}/checklist`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, isSubmitted: nextSubmitted }),
    })
    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Unable to update checklist.' })
      return
    }
    await loadChecklist()
  }

  const checklistProgress = {
    done: checklistItems.filter(it => it.isSubmitted).length,
    total: checklistItems.length
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* 1. Country Document Checklist Section */}
      <section className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden backdrop-blur-sm shadow-xl">
        <div className="bg-white/[0.03] px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <ClipboardCheck className="h-4 w-4 text-emerald-400" />
             <h3 className="text-sm font-semibold text-white tracking-wide">Submission Checklist</h3>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
            {checklistProgress.done}/{checklistProgress.total} COMPLETED
          </span>
        </div>
        <div className="p-6">
          {loadingChecklist ? (
             <div className="flex items-center justify-center py-6">
               <Loader2 className="h-6 w-6 animate-spin text-gray-700" />
             </div>
          ) : checklistItems.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4 italic">No required documents for this country.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {checklistItems.map((item) => {
                const isSubmitted = item.isSubmitted === true
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id, !isSubmitted)}
                    className={cn(
                      "group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left",
                      isSubmitted 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                        : "bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/20 hover:bg-white/[0.04]"
                    )}
                  >
                    <div className={cn(
                      "h-5 w-5 rounded-md border flex items-center justify-center transition-colors",
                      isSubmitted ? "bg-emerald-500 border-none" : "border-white/20 group-hover:border-white/40"
                    )}>
                      {isSubmitted && <Check className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <span className="text-xs font-semibold">{item.documentLabel}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* 2. Upload Form */}
      <form
        onSubmit={onUpload}
        className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-sm shadow-xl"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Quick Upload
            </h3>
            <p className="text-xs text-gray-500 max-w-sm">
              Add transcripts, passports, or relevant student files securely.
            </p>
          </div>
          <Button
            type="submit"
            disabled={uploading || !file}
            className="shrink-0 gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl h-10 px-6 transition-all"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? 'Processing…' : 'Add Document'}
          </Button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="doc-file" className="text-gray-400 text-xs font-medium">
              File Selector
            </Label>
            <Input
              id="doc-file"
              type="file"
              className="cursor-pointer bg-white/5 border-white/10 text-gray-300 rounded-xl focus:ring-blue-500/50 h-11"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-label" className="text-gray-400 text-xs font-medium">
              Display Name / Label
            </Label>
            <Input
              id="doc-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Higher Secondary Certificate"
              className="bg-white/5 border-white/10 text-gray-300 rounded-xl focus:ring-blue-500/50 h-11"
            />
          </div>
        </div>
      </form>

      {/* 3. Document List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-4 px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
              <HardDrive className="h-4 w-4 text-gray-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Stored Documents
              </h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                {loading ? 'Consulting storage…' : `${documents.length} Managed Files`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshAll}
            className="h-8 w-8 text-gray-500 hover:text-white"
            title="Refresh List"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500/50" />
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/5 bg-white/[0.01] py-16 text-center">
            <FileText className="h-10 w-10 text-gray-700 mx-auto mb-4" />
            <p className="text-sm text-gray-500 font-medium">
              Archive is empty. Start by uploading a file.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
            {documents.map((d) => (
              <div
                key={d.id}
                className="group relative flex items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.06] hover:border-white/10"
              >
                <FileThumb mimeType={d.mimeType} />
                <div className="min-w-0 flex-1">
                  {editingId === d.id ? (
                    <div className="flex items-center gap-2 mb-2 animate-in slide-in-from-left-1">
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="h-8 bg-gray-900 border-white/20 text-xs"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => onRename(d.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-gray-500 hover:text-gray-400 hover:bg-white/5"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate">
                        <p className="truncate text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                          {d.label || d.fileName}
                        </p>
                        {d.label && (
                          <p className="mt-0.5 truncate text-[10px] text-gray-500 font-medium lowercase italic">
                            Originally: {d.fileName}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10"
                          onClick={() => {
                            setEditingId(d.id)
                            setEditLabel(d.label ?? d.fileName)
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-gray-900 border-white/10">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">
                                Delete Document?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-400">
                                This will permanently remove the file from storage.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDelete(d.id)}
                                className="bg-red-600 hover:bg-red-500 text-white"
                              >
                                Delete Permanently
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-medium text-gray-500">
                    <span className="text-gray-400">{formatSize(d.sizeBytes)}</span>
                    <span className="text-gray-700">|</span>
                    <span>
                      {d.createdAt
                        ? new Date(d.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </span>
                    {d.uploaderName && (
                      <>
                        <span className="text-gray-700">|</span>
                        <span className="truncate max-w-[100px]">
                          {d.uploaderName}
                        </span>
                      </>
                    )}
                  </div>

                  <a
                    href={d.storageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    View File <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
