'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getLeadRevenues, saveLeadRevenue } from '@/lib/leads/revenue-actions'
import { apiCall } from '@/lib/utils/api-handler'
import { toast } from 'sonner'
import { Loader2, Paperclip, ExternalLink } from 'lucide-react'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getIntakeYears(): number[] {
  const cur = new Date().getFullYear()
  const years: number[] = []
  for (let y = cur - 1; y <= cur + 10; y++) years.push(y)
  return years
}

interface LeadRevenueCardProps {
  leadId: string
}

export function LeadRevenueCard({ leadId }: LeadRevenueCardProps) {
  const [revenues, setRevenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [intakeMonth, setIntakeMonth] = useState<string>('')
  const [intakeYear, setIntakeYear] = useState<string>('')
  const [university, setUniversity] = useState('')
  const [country, setCountry] = useState('')
  const [counselorFee, setCounselorFee] = useState('')
  const [universityFee, setUniversityFee] = useState('')
  const [files, setFiles] = useState<File[]>([])

  const intakeYears = getIntakeYears()

  useEffect(() => {
    fetchRevenues()
  }, [leadId])

  async function fetchRevenues() {
    try {
      const data = await getLeadRevenues(leadId)
      setRevenues(data)
    } catch (error) {
      console.error('Failed to load revenues', error)
      toast.error('Failed to load revenues')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!university || !country || !counselorFee || !universityFee) {
      toast.error('Please fill in all required fields')
      return
    }

    if (counselorFee.split('.')[0].length > 10 || universityFee.split('.')[0].length > 10) {
      toast.error('Please keep your fee characters to a maximum of 10 digits before the decimal')
      return
    }

    setSaving(true)
    try {
      const uploadedSlips = []
      
      // Upload files if any
      if (files.length > 0) {
        for (const file of files) {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('label', 'Slip')
          const res = await fetch(`/api/leads/${leadId}/documents`, {
            method: 'POST',
            body: fd,
          })
          if (!res.ok) {
            throw new Error(`Failed to upload ${file.name}`)
          }
          const docData = await res.json()
          if (docData?.data?.document) {
            uploadedSlips.push({
              id: docData.data.document.id,
              fileName: docData.data.document.fileName,
              storageUrl: docData.data.document.storageUrl,
              uploadedAt: new Date().toISOString()
            })
          }
        }
      }

      await saveLeadRevenue(leadId, {
        intakeMonth: intakeMonth ? parseInt(intakeMonth, 10) : null,
        intakeYear: intakeYear ? parseInt(intakeYear, 10) : null,
        university,
        country,
        counselorFee: parseFloat(counselorFee),
        universityFee: parseFloat(universityFee),
        slips: uploadedSlips
      })
      toast.success('Revenue saved successfully')
      // Reset form
      setIntakeMonth('')
      setIntakeYear('')
      setUniversity('')
      setCountry('')
      setCounselorFee('')
      setUniversityFee('')
      setFiles([])
      // Refresh list
      await fetchRevenues()
    } catch (error) {
      console.error('Failed to save revenue', error)
      toast.error('Failed to save revenue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Revenue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Intake Month + Year */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rev-intake-month">Intake Month</Label>
              <Select value={intakeMonth} onValueChange={setIntakeMonth} disabled={saving}>
                <SelectTrigger id="rev-intake-month" className="h-9 text-sm">
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="rev-intake-year">Intake Year</Label>
              <Select value={intakeYear} onValueChange={setIntakeYear} disabled={saving}>
                <SelectTrigger id="rev-intake-year" className="h-9 text-sm">
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
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rev-country">Country</Label>
              <Input
                id="rev-country"
                placeholder="e.g. UK"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rev-university">University</Label>
              <Input
                id="rev-university"
                placeholder="e.g. Oxford University"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rev-counselorFee">Counselor Fee</Label>
              <Input
                id="rev-counselorFee"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={counselorFee}
                onChange={(e) => setCounselorFee(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rev-universityFee">University Fee</Label>
              <Input
                id="rev-universityFee"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={universityFee}
                onChange={(e) => setUniversityFee(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rev-slips">Slip Upload</Label>
            <Input
              id="rev-slips"
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  setFiles(Array.from(e.target.files))
                }
              }}
              disabled={saving}
              className="cursor-pointer"
            />
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {files.length} file(s) selected
              </p>
            )}
          </div>

          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Revenue
          </Button>
        </form>

        <div className="space-y-4 pt-4 border-t">
          <h4 className="text-sm font-medium">Saved Revenues</h4>
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : revenues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No revenues recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {revenues.map((rev) => {
                const monthName = rev.intakeMonth ? MONTH_NAMES[rev.intakeMonth - 1] : null
                const intakeLabel = monthName && rev.intakeYear
                  ? `${monthName} ${rev.intakeYear}`
                  : monthName ?? (rev.intakeYear ? String(rev.intakeYear) : '—')
                return (
                  <div key={rev.id} className="p-3 border rounded-md text-sm space-y-2 bg-muted/20">
                    <div className="flex justify-between items-center font-medium">
                      <span>{rev.university}, {rev.country}</span>
                      <span className="text-muted-foreground text-xs">{intakeLabel}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Counselor Fee:</span>
                      <span className="font-medium text-foreground">${Number(rev.counselorFee).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>University Fee:</span>
                      <span className="font-medium text-foreground">${Number(rev.universityFee).toFixed(2)}</span>
                    </div>
                    {rev.slips && rev.slips.length > 0 && (
                      <div className="pt-2 mt-2 border-t space-y-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Paperclip className="h-3 w-3" /> Attached Slips:</span>
                        <div className="flex flex-wrap gap-2">
                          {rev.slips.map((s: any) => (
                            <a
                              key={s.id}
                              href={s.storageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-foreground hover:bg-muted/80 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {s.fileName}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
