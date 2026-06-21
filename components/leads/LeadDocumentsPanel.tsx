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
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
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
import { apiCall } from '@/lib/utils/api-handler'

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
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] shadow-inner',
        className,
      )}
    >
      <Icon className="h-5 w-5 text-[var(--muted-text)]" />
    </div>
  )
}

export function LeadDocumentsPanel({ leadId }: { leadId: string }) {
  const [documents, setDocuments] = useState<DocRow[]>([])
  const [loading, setLoading] = useState(true)
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
      setDocuments(data.data?.documents ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Storage sync failed.')
    }
  }, [leadId])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    await loadDocuments()
    setLoading(false)
  }, [loadDocuments])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  async function onUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      toast.error('Choose a file first')
      return
    }
    setUploading(true)
    const data = await apiCall(async () => {
      const fd = new FormData()
      fd.append('file', file)
      if (label.trim()) fd.append('label', label.trim())
      const res = await fetch(`/api/leads/${leadId}/documents`, {
        method: 'POST',
        body: fd,
      })
      return res.json()
    }, { successMsg: 'File uploaded', errorMsg: 'Upload failed' })
    if (data) {
      setFile(null)
      setLabel('')
      await loadDocuments()
    }
    setUploading(false)
  }

  async function onDelete(docId: string) {
    setDeletingId(docId)
    const data = await apiCall(async () => {
      const res = await fetch(`/api/leads/${leadId}/documents/${docId}`, {
        method: 'DELETE',
      })
      return res.json()
    }, { successMsg: 'Document deleted', errorMsg: 'Delete failed' })
    if (data) {
      await loadDocuments()
    }
    setDeletingId(null)
  }

  async function onRename(docId: string) {
    const data = await apiCall(async () => {
      const res = await fetch(`/api/leads/${leadId}/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editLabel }),
      })
      return res.json()
    }, { successMsg: 'Document label updated', errorMsg: 'Rename failed' })
    if (data) {
      await loadDocuments()
      setEditingId(null)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">

      {/* 2. Upload Form */}
      <form
        onSubmit={onUpload}
        className="rounded-[12px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] p-6 sm:p-8 shadow-crm-sm"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-[14px] font-medium text-[var(--text-strong)]">
              Quick Upload
            </h3>
            <p className="text-[12px] text-[var(--muted-text)] max-w-sm">
              Add transcripts, passports, or relevant student files securely.
            </p>
          </div>
          <Button
            type="submit"
            disabled={uploading || !file}
            className="shrink-0 gap-2 bg-[var(--accent-color)] hover:brightness-95 text-[var(--accent-text)] rounded-[8px] h-10 px-6 font-medium text-[13px] transition-all shadow-sm"
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
          <div className="space-y-1.5">
            <Label htmlFor="doc-file" className="text-[var(--muted-text)] text-[12px] font-medium">
              File Selector
            </Label>
            <Input
              id="doc-file"
              type="file"
              className="cursor-pointer bg-[var(--main-bg)] border-[0.5px] border-[var(--card-border-color)] text-[var(--text-strong)] rounded-[8px] h-10 focus-visible:ring-0 focus-visible:border-[var(--text-strong)] text-xs"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-label" className="text-[var(--muted-text)] text-[12px] font-medium">
              Display Name / Label
            </Label>
            <Input
              id="doc-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Higher Secondary Certificate"
              className="bg-[var(--main-bg)] border-[0.5px] border-[var(--card-border-color)] text-[var(--text-strong)] rounded-[8px] h-10 focus-visible:ring-0 focus-visible:border-[var(--text-strong)] text-xs placeholder:text-[var(--muted-text)]"
            />
          </div>
        </div>
      </form>

      {/* 3. Document List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--card-border-color)] pb-4 px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[8px] bg-[var(--main-bg)] border-[0.5px] border-[var(--card-border-color)]">
              <HardDrive className="h-4 w-4 text-[var(--muted-text)]" />
            </div>
            <div>
              <h3 className="text-[14px] font-medium text-[var(--text-strong)]">
                Stored Documents
              </h3>
              <p className="text-[11px] text-[var(--muted-text)] font-medium">
                {loading ? 'Consulting storage…' : `${documents.length} Managed Files`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshAll}
            className="h-8 w-8 text-[var(--muted-text)] hover:text-[var(--text-strong)] hover:bg-[var(--main-bg)] rounded-[6px]"
            title="Refresh List"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-text)]" />
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-[var(--card-border-color)] bg-[var(--card-bg)] py-16 text-center shadow-crm-xs">
            <FileText className="h-8 w-8 text-[var(--muted-text)] mx-auto mb-3" />
            <p className="text-[13px] text-[var(--muted-text)] font-medium">
              Archive is empty. Start by uploading a file.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
            {documents.map((d) => (
              <div
                key={d.id}
                className="group relative flex items-start gap-4 rounded-[12px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] p-4 shadow-crm-xs transition-all hover:border-[var(--text-strong)]"
              >
                <FileThumb mimeType={d.mimeType} />
                <div className="min-w-0 flex-1">
                  {editingId === d.id ? (
                    <div className="flex items-center gap-2 mb-2 animate-in slide-in-from-left-1">
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="h-8 bg-[var(--main-bg)] border-[0.5px] border-[var(--card-border-color)] text-[var(--text-strong)] text-xs rounded-[6px]"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-[6px]"
                        onClick={() => onRename(d.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-[var(--muted-text)] hover:text-[var(--text-strong)] hover:bg-[var(--main-bg)] rounded-[6px]"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate">
                        <p className="truncate text-[13px] font-semibold text-[var(--text-strong)] transition-colors">
                          {d.label || d.fileName}
                        </p>
                        {d.label && (
                          <p className="mt-0.5 truncate text-[11px] text-[var(--muted-text)] font-medium lowercase italic">
                            Originally: {d.fileName}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-[var(--muted-text)] hover:text-[var(--text-strong)] hover:bg-[var(--main-bg)] rounded-[6px]"
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
                              className="h-7 w-7 text-[var(--muted-text)] hover:text-red-600 hover:bg-red-50 rounded-[6px]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[var(--card-bg)] border-[0.5px] border-[var(--card-border-color)] rounded-[12px]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-[var(--text-strong)] text-[16px] font-semibold">
                                Delete Document?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-[var(--muted-text)] text-[13px]">
                                This will permanently remove the file from storage.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-[var(--main-bg)] border-[0.5px] border-[var(--card-border-color)] text-[var(--text-strong)] hover:brightness-95 rounded-[8px] text-xs">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDelete(d.id)}
                                className="bg-red-500 hover:bg-red-600 text-white rounded-[8px] text-xs"
                              >
                                Delete Permanently
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-[var(--muted-text)]">
                    <span>{formatSize(d.sizeBytes)}</span>
                    <span className="opacity-40">•</span>
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
                        <span className="opacity-40">•</span>
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
                    className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--muted-text)] hover:text-[var(--text-strong)] hover:underline transition-colors"
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