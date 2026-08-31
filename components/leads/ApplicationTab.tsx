'use client'

import { useEffect, useState, useMemo } from 'react'
import { Loader2, GraduationCap } from 'lucide-react'
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

interface ApplicationData {
  id?: string
  universityName: string
  courseName: string
  source: ApplicationSource | ''
  partnerPortalName: string
  applicationStatus: ApplicationStatus | ''
  intakeMonth: string
  intakeYear: string
}

const EMPTY_FORM: ApplicationData = {
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

// ─── Intake year range: current year − 1 to current year + 10 ─
function getIntakeYears(): number[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = currentYear - 1; y <= currentYear + 10; y++) {
    years.push(y)
  }
  return years
}

// ─── Validation ───────────────────────────────────────────────

function validate(form: ApplicationData): Record<string, string> {
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

// ─── Component ────────────────────────────────────────────────

export function ApplicationTab({ leadId }: { leadId: string }) {
  const [form, setForm] = useState<ApplicationData>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())

  const intakeYears = useMemo(() => getIntakeYears(), [])

  // Load existing application on mount
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/leads/${leadId}/application`)
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return
        const app = res?.data?.application
        if (app) {
          setForm({
            id: app.id,
            universityName: app.universityName ?? '',
            courseName: app.courseName ?? '',
            source: (app.source as ApplicationSource) ?? '',
            partnerPortalName: app.partnerPortalName ?? '',
            applicationStatus: (app.applicationStatus as ApplicationStatus) ?? '',
            intakeMonth: app.intakeMonth != null ? String(app.intakeMonth) : '',
            intakeYear: app.intakeYear != null ? String(app.intakeYear) : '',
          })
        } else {
          setForm(EMPTY_FORM)
        }
      })
      .catch(() => setForm(EMPTY_FORM))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [leadId])

  const fieldErrors = useMemo(() => validate(form), [form])
  const hasErrors = Object.keys(fieldErrors).length > 0

  function touch(field: string) {
    setTouched((prev) => new Set(prev).add(field))
  }

  function setField<K extends keyof ApplicationData>(key: K, value: ApplicationData[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      // Clear conditional fields when their condition is no longer met
      if (key === 'source' && value !== 'partner_portal') {
        next.partnerPortalName = ''
      }
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
    // Touch all fields to show all validation errors
    const allFields = [
      'universityName', 'courseName', 'source', 'partnerPortalName',
      'applicationStatus', 'intakeMonth', 'intakeYear',
    ]
    setTouched(new Set(allFields))
    setErrors(fieldErrors)

    if (hasErrors) return

    setSaving(true)

    const payload = {
      universityName: form.universityName.trim(),
      courseName: form.courseName.trim(),
      source: form.source as ApplicationSource,
      partnerPortalName:
        form.source === 'partner_portal' ? form.partnerPortalName.trim() || null : null,
      applicationStatus: form.applicationStatus as ApplicationStatus,
      intakeMonth:
        form.applicationStatus === 'intake' && form.intakeMonth
          ? parseInt(form.intakeMonth, 10)
          : null,
      intakeYear:
        form.applicationStatus === 'intake' && form.intakeYear
          ? parseInt(form.intakeYear, 10)
          : null,
    }

    const result = await apiCall(
      async () => {
        const res = await fetch(`/api/leads/${leadId}/application`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error ?? 'Failed to save application')
        return data
      },
      {
        successMsg: 'Application saved',
        errorMsg: 'Failed to save application',
      },
    )

    if (result?.data?.application) {
      // Optimistic: update local form with returned data
      const app = result.data.application
      setForm((prev) => ({ ...prev, id: app.id }))
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isEditMode = Boolean(form.id)

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-crm-sm dark:bg-[#0f172a] dark:border-slate-700">
        {/* Header */}
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-5 flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
            <GraduationCap className="w-3.5 h-3.5" />
          </span>
          {isEditMode ? 'Edit Application' : 'Add Application'}
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
            {getError('universityName') && (
              <p className="text-xs text-red-500">{getError('universityName')}</p>
            )}
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
            {getError('courseName') && (
              <p className="text-xs text-red-500">{getError('courseName')}</p>
            )}
          </div>

          {/* Source */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Source <span className="text-red-400">*</span>
            </label>
            <Select
              value={form.source || ''}
              onValueChange={(val) => setField('source', val as ApplicationSource)}
            >
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
            {getError('source') && (
              <p className="text-xs text-red-500">{getError('source')}</p>
            )}
          </div>

          {/* Partner Portal Name — mounted only when source = partner_portal */}
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
              {getError('partnerPortalName') && (
                <p className="text-xs text-red-500">{getError('partnerPortalName')}</p>
              )}
            </div>
          )}

          {/* Application Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Application Status <span className="text-red-400">*</span>
            </label>
            <Select
              value={form.applicationStatus || ''}
              onValueChange={(val) => setField('applicationStatus', val as ApplicationStatus)}
            >
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
            {getError('applicationStatus') && (
              <p className="text-xs text-red-500">{getError('applicationStatus')}</p>
            )}
          </div>

          {/* Intake Month + Year — mounted only when applicationStatus = intake */}
          {form.applicationStatus === 'intake' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Intake Month <span className="text-red-400">*</span>
                </label>
                <Select
                  value={form.intakeMonth || ''}
                  onValueChange={(val) => setField('intakeMonth', val)}
                >
                  <SelectTrigger
                    id="app-intake-month"
                    className={`h-9 text-sm ${getError('intakeMonth') ? 'border-red-400 focus:ring-red-400/30' : ''}`}
                    onBlur={() => touch('intakeMonth')}
                  >
                    <SelectValue placeholder="Month…" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, idx) => (
                      <SelectItem key={name} value={String(idx + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getError('intakeMonth') && (
                  <p className="text-xs text-red-500">{getError('intakeMonth')}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Intake Year <span className="text-red-400">*</span>
                </label>
                <Select
                  value={form.intakeYear || ''}
                  onValueChange={(val) => setField('intakeYear', val)}
                >
                  <SelectTrigger
                    id="app-intake-year"
                    className={`h-9 text-sm ${getError('intakeYear') ? 'border-red-400 focus:ring-red-400/30' : ''}`}
                    onBlur={() => touch('intakeYear')}
                  >
                    <SelectValue placeholder="Year…" />
                  </SelectTrigger>
                  <SelectContent>
                    {intakeYears.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getError('intakeYear') && (
                  <p className="text-xs text-red-500">{getError('intakeYear')}</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Summary card — shown when application is saved */}
        {isEditMode && (
          <div className="mt-5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-4 py-3 text-xs text-indigo-700 dark:text-indigo-400 space-y-1">
            <p className="font-semibold text-indigo-800 dark:text-indigo-300">Current saved application</p>
            <p>🏫 {form.universityName} — {form.courseName}</p>
            <p>
              📋 {SOURCE_LABELS[form.source as ApplicationSource] ?? form.source}
              {form.source === 'partner_portal' && form.partnerPortalName && ` (${form.partnerPortalName})`}
            </p>
            <p>
              🔖 {STATUS_LABELS[form.applicationStatus as ApplicationStatus] ?? form.applicationStatus}
              {form.applicationStatus === 'intake' && form.intakeMonth && form.intakeYear
                ? ` — ${MONTH_NAMES[parseInt(form.intakeMonth, 10) - 1]} ${form.intakeYear}`
                : ''}
            </p>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-5 flex items-center justify-between">
          {hasErrors && touched.size > 0 ? (
            <p className="text-xs text-red-500">Please fill in all required fields</p>
          ) : (
            <span />
          )}
          <Button
            id="app-save-button"
            onClick={handleSave}
            disabled={saving || (hasErrors && touched.size > 0)}
            className="h-9 px-5 bg-white hover:bg-brand-hover dark:text-blue-900 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditMode ? 'Update Application' : 'Save Application'}
          </Button>
        </div>
      </div>
    </div>
  )
}
