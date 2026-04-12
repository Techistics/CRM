'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Upload,
  ExternalLink,
  HardDrive,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

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

function FileThumb({ mimeType, className }: { mimeType: string | null; className?: string }) {
  const isImage = mimeType?.startsWith('image/')
  const Icon = isImage ? ImageIcon : FileText
  return (
    <div
      className={cn(
        'flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border bg-muted/60',
        className,
      )}
    >
      <Icon className="h-7 w-7 text-muted-foreground" />
    </div>
  )
}

export function LeadDocumentsPanel({ leadId }: { leadId: string }) {
  const { toast } = useToast()
  const [documents, setDocuments] = useState<DocRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [label, setLabel] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/documents`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      setDocuments(data.documents ?? [])
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not load documents',
        description: e instanceof Error ? e.message : 'Try again.',
      })
    } finally {
      setLoading(false)
    }
  }, [leadId, toast])

  useEffect(() => {
    void load()
  }, [load])

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
      toast({ title: 'File uploaded', description: data.document?.fileName ?? 'Saved.' })
      await load()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Check storage configuration.',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={onUpload}
        className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-6 sm:p-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Upload a document</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              PDFs, images, and office files. Stored in your configured object storage (Vercel Blob
              when <code className="rounded bg-muted px-1 text-[10px]">BLOB_READ_WRITE_TOKEN</code>{' '}
              is set).
            </p>
          </div>
          <Button type="submit" disabled={uploading || !file} className="shrink-0 gap-2">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="doc-file">File</Label>
            <Input
              id="doc-file"
              type="file"
              className="cursor-pointer bg-background"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-label">Label (optional)</Label>
            <Input
              id="doc-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Passport scan"
              className="bg-background"
            />
          </div>
        </div>
      </form>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Uploaded files</h3>
          {!loading && (
            <span className="text-xs text-muted-foreground">({documents.length})</span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin opacity-50" />
          </div>
        ) : documents.length === 0 ? (
          <p className="rounded-lg border border-border/60 bg-muted/10 py-10 text-center text-sm text-muted-foreground">
            No documents yet. Upload transcripts, passports, or offer letters here.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((d) => (
              <li key={d.id}>
                <a
                  href={d.storageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <FileThumb mimeType={d.mimeType} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                      {d.fileName}
                    </p>
                    {d.label && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{d.label}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      <span>{formatSize(d.sizeBytes)}</span>
                      <span>·</span>
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
                          <span>·</span>
                          <span className="truncate">{d.uploaderName}</span>
                        </>
                      )}
                    </div>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Open <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
