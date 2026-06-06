'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { apiCall } from '@/lib/utils/api-handler'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type TemplateRow = {
  id: string
  tenantId: string
  name: string
  stage: string | null
  message: string
  createdBy: string | null
  createdAt: string
}

function truncate(s: string, max = 70) {
  const trimmed = s.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max)}…`
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pipelineStages, setPipelineStages] = useState<Array<{ key: string; label: string }>>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [tenantSlug, setTenantSlug] = useState<string>('')

  const [form, setForm] = useState({
    name: '',
    stage: 'all' as string,
    message: '',
  })

  useEffect(() => {
    const parts = window.location.pathname.split('/')
    const idx = parts.indexOf('t')
    const slug = idx >= 0 ? parts[idx + 1] : ''
    setTenantSlug(slug ?? '')
  }, [])

  const load = async (slug: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/templates?tenantSlug=${encodeURIComponent(slug)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Failed to load templates')
      setTemplates((json?.data?.templates ?? []) as TemplateRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!tenantSlug) return
    void load(tenantSlug)
    ;(async () => {
      try {
        const res = await fetch('/api/pipeline-stages')
        const json = await res.json()
        setPipelineStages((json?.data?.stages ?? json?.stages ?? []) as Array<{ key: string; label: string }>)
      } catch {
        setPipelineStages([])
      }
    })()
  }, [tenantSlug])

  const stageLabelByValue = useMemo(() => {
    const map = new Map<string, string>()
    pipelineStages.forEach((s) => map.set(s.key, s.label))
    return map
  }, [pipelineStages])

  const openAdd = () => {
    setEditingId(null)
    setForm({ name: '', stage: 'all', message: '' })
    setDialogOpen(true)
  }

  const openEdit = (t: TemplateRow) => {
    setEditingId(t.id)
    setForm({ name: t.name, stage: t.stage ?? 'all', message: t.message })
    setDialogOpen(true)
  }

  const save = async () => {
    if (!tenantSlug) return
    setSaving(true)

    if (editingId) {
      const data = await apiCall(async () => {
        const res = await fetch(`/api/templates/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            stage: form.stage === 'all' ? null : form.stage,
            message: form.message,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error ?? 'Failed to update template')
        return json as { data?: { template?: TemplateRow } }
      }, { successMsg: 'Template updated', errorMsg: 'Failed to update template' })

      const updated = data?.data?.template
      if (updated) {
        setTemplates((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        setDialogOpen(false)
      }
      setSaving(false)
      return
    }

    const data = await apiCall(async () => {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug,
          name: form.name,
          stage: form.stage === 'all' ? null : form.stage,
          message: form.message,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Failed to create template')
      return json as { data?: { template?: TemplateRow } }
    }, { successMsg: 'Template created', errorMsg: 'Failed to create template' })

    const created = data?.data?.template
    if (created) {
      setTemplates((prev) => [created, ...prev])
      setDialogOpen(false)
    }
    setSaving(false)
  }

  const remove = async (id: string) => {
    const data = await apiCall(async () => {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Failed to delete template')
      return json as { data?: { success?: boolean } }
    }, { successMsg: 'Template deleted', errorMsg: 'Failed to delete template' })

    if (!data) return
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="w-full min-w-0 space-y-6 p-0 sm:p-2 lg:p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#223955] flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Templates
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Quick follow-up templates for WhatsApp and outreach
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Template' : 'Add Template'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="text-xs font-medium">Name</div>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Follow-up after no response"
                />
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-medium">Stage (optional)</div>
                <Select
                  value={form.stage}
                  onValueChange={(v) => setForm((p) => ({ ...p, stage: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stages</SelectItem>
                    {pipelineStages.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-medium">Message</div>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  placeholder="Supports {name}, {country}, {programme}"
                  className="min-h-[140px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void save()}
                disabled={saving || !form.name.trim() || !form.message.trim()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">All templates</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-10 text-center text-destructive">{error}</div>
          ) : templates.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No templates yet. Create your first one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.stage ? stageLabelByValue.get(t.stage) ?? t.stage : 'All'}
                      </TableCell>
                      <TableCell className={cn('text-sm text-muted-foreground', 'max-w-[520px]')}>
                        {truncate(t.message)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
                            onClick={() => void remove(t.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

