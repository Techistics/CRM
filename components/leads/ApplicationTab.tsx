'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Loader2, GraduationCap, Plus, Pencil, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { apiCall } from '@/lib/utils/api-handler'

// ─── Types ────────────────────────────────────────────────────

type ApplicationSource = 'direct_uni' | 'partner_portal'
type ApplicationStatus = 'tag' | 'new_application' | 'intake'

interface Application {
  id: string
  universityName: string
  courseName: string
  source: ApplicationSource
  partnerPortalName: string | null
  applicationStatus: ApplicationStatus
  intakeMonth: number | null
  intakeYear: number | null
  createdAt: string
}

interface FormData {
  universityName: string
  courseName: string
  source: ApplicationSource | ''
  partnerPortalName: string
  applicationStatus: ApplicationStatus | ''
  intakeMonth: string
  intakeYear: string
}

const EMPTY_FORM: FormData = {
  universityName: '',
  courseName: '',
  source: '',
  partnerPortalName: '',
  applicationStatus: '',
  intakeMonth: '',
  intakeYear: '',
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const SOURCE_LABELS: Record<ApplicationSource, string> = {
  direct_uni: 'Direct Uni',
  partner_portal: 'Partner Portal',
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  tag: 'Tag',
  new_application: 'New Application',
  intake: 'Intake',
}

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  tag: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  new_application: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  intake: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
}

function getIntakeYears(): number[] {
  const y = new Date().getFullYear()
  const years: number[] = []
  for (let i = y - 1; i <= y + 10; i++) years.push(i)
  return years
}

// ─── Validation ───────────────────────────────────────────────

function validate(form: FormData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.universityName.trim()) errors.universityName = 'University name is required'
  if (!form.courseName.trim()) errors.courseName = 'Course name is required'
  if (!form.source) errors.source = 'Source is required'
  if (form.source === 'partner_portal' && !form.partnerPortalName.trim()) {
    errors.partnerPortalName = 'Partner portal name is required'
  }
  if (!form.applicationStatus) errors.applicationStatus = 'Application status is required'
  if (form.applicationStatus === 'intake') {
    if (!form.intakeMonth) errors.intakeMonth = 'Intake month is required'
    if (!form.intakeYear) errors.intakeYear = 'Intake year is required'
  }
  return errors
}

// ─── Application Form (inline) ────────────────────────────────

function ApplicationForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: FormData
  onSave: (form: FormData) => Promise<void>
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<FormData>(initial)
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const intakeYears = useMemo(() => getIntakeYears(), [])
  const fieldErrors = useMemo(() => validate(form), [form])
  const hasErrors = Object.keys(fieldErrors).length > 0

  function touch(field: string) {
    setTouched((prev) => new Set(prev).add(field))
  }

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'source' && value !== 'partner_portal') next.partnerPortalName = ''
      if (key === 'applicationStatus' && value !== 'intake') {
        next.intakeMonth = ''
        next.intakeYear = ''
      }
      return next
    })
    touch(key)
  }

  function getError(field: string) {
    return touched.has(field) ? fieldErrors[field] : undefined
  }

  async function handleSave() {
    const allFields = ['universityName', 'courseName', 'source', 'partnerPortalName', 'applicationStatus', 'intakeMonth', 'intakeYear']
    setTouched(new Set(allFields))
    if (hasErrors) return
    await onSave(form)
  }

  return (
    <div className="border border-indigo-200 dark:border-indigo-500/30 rounded-xl bg-indigo-50/40 dark:bg-indigo-500/5 p-4 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* University Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            University Name <span className="text-red-400">*</span>
          </label>
          <Input
            id="app-university-name"
            value={form.universityName}
            onChange={(e) => setField('universityName', e.target.value)}
            onBlur={() => touch('universityName')}
            placeholder="e.g. University of Toronto"
            className={`h-9 text-sm ${getError('universityName') ? 'border-red-400 focus-visible:ring-red-400/30' : ''}`}
          />
          {getError('universityName') && <p className="text-xs text-red-500">{getError('universityName')}</p>}
        </div>

        {/* Course Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Course Name <span className="text-red-400">*</span>
          </label>
          <Input
            id="app-course-name"
            value={form.courseName}
            onChange={(e) => setField('courseName', e.target.value)}
            onBlur={() => touch('courseName')}
            placeholder="e.g. BSc Computer Science"
            className={`h-9 text-sm ${getError('courseName') ? 'border-red-400 focus-visible:ring-red-400/30' : ''}`}
          />
          {getError('courseName') && <p className="text-xs text-red-500">{getError('courseName')}</p>}
        </div>

        {/* Source */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Source <span className="text-red-400">*</span>
          </label>
          <Select value={form.source || ''} onValueChange={(val) => setField('source', val as ApplicationSource)}>
            <SelectTrigger
              id="app-source"
              className={`h-9 text-sm ${getError('source') ? 'border-red-400 focus:ring-red-400/30' : ''}`}
              onBlur={() => touch('source')}
            >
              <SelectValue placeholder="Select source…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="direct_uni">Direct Uni</SelectItem>
              <SelectItem value="partner_portal">Partner Portal</SelectItem>
            </SelectContent>
          </Select>
          {getError('source') && <p className="text-xs text-red-500">{getError('source')}</p>}
        </div>

        {/* Partner Portal Name */}
        {form.source === 'partner_portal' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Partner Portal Name <span className="text-red-400">*</span>
            </label>
            <Input
              id="app-partner-portal-name"
              value={form.partnerPortalName}
              onChange={(e) => setField('partnerPortalName', e.target.value)}
              onBlur={() => touch('partnerPortalName')}
              placeholder="e.g. StudyAbroad Portal"
              className={`h-9 text-sm ${getError('partnerPortalName') ? 'border-red-400 focus-visible:ring-red-400/30' : ''}`}
            />
            {getError('partnerPortalName') && <p className="text-xs text-red-500">{getError('partnerPortalName')}</p>}
          </div>
        )}

        {/* Application Status */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Application Status <span className="text-red-400">*</span>
          </label>
          <Select value={form.applicationStatus || ''} onValueChange={(val) => setField('applicationStatus', val as ApplicationStatus)}>
            <SelectTrigger
              id="app-application-status"
              className={`h-9 text-sm ${getError('applicationStatus') ? 'border-red-400 focus:ring-red-400/30' : ''}`}
              onBlur={() => touch('applicationStatus')}
            >
              <SelectValue placeholder="Select status…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tag">Tag</SelectItem>
              <SelectItem value="new_application">New Application</SelectItem>
              <SelectItem value="intake">Intake</SelectItem>
            </SelectContent>
          </Select>
          {getError('applicationStatus') && <p className="text-xs text-red-500">{getError('applicationStatus')}</p>}
        </div>

        {/* Intake Month + Year */}
        {form.applicationStatus === 'intake' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Intake Month <span className="text-red-400">*</span>
              </label>
              <Select value={form.intakeMonth || ''} onValueChange={(val) => setField('intakeMonth', val)}>
                <SelectTrigger id="app-intake-month" className={`h-9 text-sm ${getError('intakeMonth') ? 'border-red-400' : ''}`} onBlur={() => touch('intakeMonth')}>
                  <SelectValue placeholder="Month…" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, idx) => (
                    <SelectItem key={name} value={String(idx + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getError('intakeMonth') && <p className="text-xs text-red-500">{getError('intakeMonth')}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Intake Year <span className="text-red-400">*</span>
              </label>
              <Select value={form.intakeYear || ''} onValueChange={(val) => setField('intakeYear', val)}>
                <SelectTrigger id="app-intake-year" className={`h-9 text-sm ${getError('intakeYear') ? 'border-red-400' : ''}`} onBlur={() => touch('intakeYear')}>
                  <SelectValue placeholder="Year…" />
                </SelectTrigger>
                <SelectContent>
                  {intakeYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getError('intakeYear') && <p className="text-xs text-red-500">{getError('intakeYear')}</p>}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          id="app-form-cancel"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={saving}
          className="h-8 px-3 text-xs"
        >
          <X className="w-3.5 h-3.5 mr-1" /> Cancel
        </Button>
        <Button
          id="app-form-save"
          size="sm"
          onClick={handleSave}
          disabled={saving || (hasErrors && touched.size > 0)}
          className="h-8 px-4 text-xs dark:bg-brand dark:text-blue-900 text-white font-medium"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
          {saving ? 'Saving…' : 'Save Application'}
        </Button>
      </div>
    </div>
  )
}

// ─── Application Card ─────────────────────────────────────────

function ApplicationCard({
  app,
  index,
  onEdit,
  onDelete,
  deleting,
}: {
  app: Application
  index: number
  onEdit: (app: Application) => void
  onDelete: (id: string) => void
  deleting: boolean
}) {
  const statusColor = STATUS_COLORS[app.applicationStatus] ?? STATUS_COLORS.tag

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] p-4 flex items-start justify-between gap-3 shadow-sm">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
          {index + 1}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{app.universityName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{app.courseName}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor}`}>
              {STATUS_LABELS[app.applicationStatus]}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {SOURCE_LABELS[app.source]}
              {app.source === 'partner_portal' && app.partnerPortalName && ` · ${app.partnerPortalName}`}
            </span>
            {app.applicationStatus === 'intake' && app.intakeMonth && app.intakeYear && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                · {MONTH_NAMES[(app.intakeMonth ?? 1) - 1]} {app.intakeYear}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          id={`app-edit-${app.id}`}
          onClick={() => onEdit(app)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 transition-colors"
          title="Edit application"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          id={`app-delete-${app.id}`}
          onClick={() => onDelete(app.id)}
          disabled={deleting}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors disabled:opacity-50"
          title="Delete application"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────

export function ApplicationTab({ leadId }: { leadId: string }) {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingApp, setEditingApp] = useState<Application | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchApps = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/application`)
      const data = await res.json()
      setApps(data?.data?.applications ?? [])
    } catch {
      setApps([])
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => { fetchApps() }, [fetchApps])

  async function handleCreate(form: FormData) {
    setSaving(true)
    const payload = buildPayload(form)
    const result = await apiCall(
      async () => {
        const res = await fetch(`/api/leads/${leadId}/application`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error ?? 'Failed to save')
        return data
      },
      { successMsg: 'Application added', errorMsg: 'Failed to add application' },
    )
    if (result?.data?.application) {
      setApps((prev) => [...prev, result.data.application])
      setShowAddForm(false)
    }
    setSaving(false)
  }

  async function handleUpdate(form: FormData) {
    if (!editingApp) return
    setSaving(true)
    const payload = buildPayload(form)
    const result = await apiCall(
      async () => {
        const res = await fetch(`/api/leads/${leadId}/application/${editingApp.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error ?? 'Failed to update')
        return data
      },
      { successMsg: 'Application updated', errorMsg: 'Failed to update application' },
    )
    if (result?.data?.application) {
      setApps((prev) => prev.map((a) => a.id === editingApp.id ? result.data.application : a))
      setEditingApp(null)
    }
    setSaving(false)
  }

  async function handleDelete(appId: string) {
    setDeletingId(appId)
    await apiCall(
      async () => {
        const res = await fetch(`/api/leads/${leadId}/application/${appId}`, { method: 'DELETE' })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error ?? 'Failed to delete')
        return data
      },
      { successMsg: 'Application removed', errorMsg: 'Failed to remove application' },
    )
    setApps((prev) => prev.filter((a) => a.id !== appId))
    setDeletingId(null)
  }

  function appToForm(app: Application): FormData {
    return {
      universityName: app.universityName,
      courseName: app.courseName,
      source: app.source,
      partnerPortalName: app.partnerPortalName ?? '',
      applicationStatus: app.applicationStatus,
      intakeMonth: app.intakeMonth != null ? String(app.intakeMonth) : '',
      intakeYear: app.intakeYear != null ? String(app.intakeYear) : '',
    }
  }

  function buildPayload(form: FormData) {
    return {
      universityName: form.universityName.trim(),
      courseName: form.courseName.trim(),
      source: form.source as ApplicationSource,
      partnerPortalName: form.source === 'partner_portal' ? form.partnerPortalName.trim() || null : null,
      applicationStatus: form.applicationStatus as ApplicationStatus,
      intakeMonth: form.applicationStatus === 'intake' && form.intakeMonth ? parseInt(form.intakeMonth, 10) : null,
      intakeYear: form.applicationStatus === 'intake' && form.intakeYear ? parseInt(form.intakeYear, 10) : null,
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <GraduationCap className="w-3.5 h-3.5" />
          </span>
          Applications
          {apps.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
              {apps.length}
            </span>
          )}
        </h2>
        {!showAddForm && editingApp === null && (
          <Button
            id="app-add-new"
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="h-8 px-3 text-xs dark:bg-brand dark:text-blue-900 text-white font-medium gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Application
          </Button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <ApplicationForm
          initial={EMPTY_FORM}
          onSave={handleCreate}
          onCancel={() => setShowAddForm(false)}
          saving={saving}
        />
      )}

      {/* Application Cards */}
      {apps.length === 0 && !showAddForm ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <GraduationCap className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm font-medium">No applications yet</p>
          <p className="text-xs mt-0.5">Click &quot;Add Application&quot; to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {apps.map((app, idx) => (
            <div key={app.id}>
              {editingApp?.id === app.id ? (
                <ApplicationForm
                  initial={appToForm(app)}
                  onSave={handleUpdate}
                  onCancel={() => setEditingApp(null)}
                  saving={saving}
                />
              ) : (
                <ApplicationCard
                  app={app}
                  index={idx}
                  onEdit={setEditingApp}
                  onDelete={handleDelete}
                  deleting={deletingId === app.id}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
