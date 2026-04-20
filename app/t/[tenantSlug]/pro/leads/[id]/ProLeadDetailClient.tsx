'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import type { Lead } from '@/types/models'
import LeadActivityTimeline from '@/components/LeadActivityTimeline'
import { useToast } from '@/hooks/use-toast'
import { STAGE_LABELS } from '@/constants/leads'
import { PIPELINE_STAGES } from '@/constants/pipeline-stages'
import { tenantPath } from '@/lib/tenant-path'
import { LeadDocumentsPanel } from '@/components/lead/LeadDocumentsPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { StageValue, ActivityRow } from '@/types/leads'

const ORDERED_STAGES: StageValue[] = PIPELINE_STAGES.map((s) => s.value)

export default function ProLeadDetailClient({
  lead,
  activities: initialActivities,
}: {
  lead: Lead
  activities: ActivityRow[]
}) {
  const { toast } = useToast()
  const router = useRouter()
  const params = useParams()
  const tenantSlug = String(params?.tenantSlug ?? '')
  const [stage, setStage] = useState(lead.stage ?? 'new_lead')
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState<'note' | 'call' | 'message'>('note')
  const [saving, setSaving] = useState(false)
  const [addingNote, setAddingNote] = useState(false)

  async function handleStageChange(newStage: StageValue) {
    const previous = stage
    setStage(newStage)
    setSaving(true)
    const res = await fetch(`/api/pro/leads/${lead.id}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    })
    setSaving(false)
    if (!res.ok) {
      setStage(previous)
      toast({
        variant: 'destructive',
        title: 'Stage update failed',
        description: 'Could not save the new stage.',
      })
      return
    }
    toast({ title: 'Stage Updated', description: 'Lead stage has been successfully updated.' })
    router.refresh()
  }

  async function handleAddNote() {
    if (!note.trim()) return
    setAddingNote(true)
    await fetch(`/api/pro/leads/${lead.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, type: noteType }),
    })
    setNote('')
    setAddingNote(false)
    toast({ title: 'Activity Added', description: 'Your note was attached to the lead.' })
    router.refresh()
  }

  const currentStageObj = STAGE_LABELS[stage] ?? STAGE_LABELS['new_lead']

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={tenantSlug ? tenantPath(tenantSlug, '/pro/leads') : '/pro/leads'}
            className="text-blue-600 font-medium text-sm hover:text-blue-700 transition flex items-center gap-1 w-max bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to My Leads
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4 tracking-tight">{lead.fullName}</h1>
          <div className="flex items-center gap-3 mt-3">
            <span className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium bg-white shadow-sm ${currentStageObj.color}`}>
              {currentStageObj.label}
            </span>
            {saving && <span className="text-gray-400 font-medium text-xs flex items-center gap-1.5"><svg className="animate-spin h-3 w-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Saving...</span>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-8 p-1 bg-gray-100/80 backdrop-blur rounded-xl border border-gray-200 inline-flex">
          <TabsTrigger value="overview" className="px-6 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">Overview</TabsTrigger>
          <TabsTrigger value="documents" className="px-6 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="outline-none">
          <div className="bg-gray-900 rounded-3xl overflow-hidden shadow-2xl p-8 min-h-[600px]">
             <LeadDocumentsPanel leadId={lead.id} />
          </div>
        </TabsContent>

        <TabsContent value="overview" className="outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Contact info */}
              <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
                <h2 className="text-gray-900 font-semibold mb-5 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </span>
                  Contact Info
                </h2>
                <div className="grid grid-cols-2 gap-5 text-sm">
                  {[
                    { label: 'Email', value: lead.email },
                    { label: 'Phone', value: lead.contactNumber },
                    { label: 'City', value: lead.city },
                    { label: 'Qualification', value: lead.lastQualification },
                    { label: 'Grades', value: lead.grades },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-gray-500 font-medium">{label}</p>
                      <p className="text-gray-900 font-medium mt-1 bg-gray-50 px-2 py-1.5 rounded-md border border-gray-100">{value ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pipeline */}
              <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
                <h2 className="text-gray-900 font-semibold mb-5 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </span>
                  Pipeline Stage
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ORDERED_STAGES.map((s) => {
                    const isSelected = stage === s
                    const stageObj = STAGE_LABELS[s]
                    return (
                      <button
                        key={s}
                        onClick={() => handleStageChange(s)}
                        className={`text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                          isSelected
                            ? `bg-gray-50 shadow-sm border-gray-300 ring-1 ring-gray-200 ${stageObj.color.split(' ')[1]}`
                            : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                           <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'}`}>
                             {isSelected && <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                           </div>
                           {stageObj.label}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Add note */}
              <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
                <h2 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </span>
                  Add Activity
                </h2>
                <div className="flex gap-2 mb-3 bg-gray-50 p-1.5 rounded-xl w-max border border-gray-100">
                  {(['note', 'call', 'message'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setNoteType(t)}
                      className={`text-xs px-3.5 py-1.5 rounded-lg transition-all font-medium capitalize shadow-sm ${
                        noteType === t
                          ? 'bg-white text-gray-900 border border-gray-200'
                          : 'border border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={`Add a ${noteType} for future reference...`}
                  rows={3}
                  className="w-full bg-white border border-gray-200 shadow-sm rounded-xl px-4 py-3 text-gray-900 text-sm placeholder-gray-400 resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleAddNote}
                    disabled={!note.trim() || addingNote}
                    className="bg-gray-900 hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:shadow-none text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all"
                  >
                    {addingNote ? 'Saving...' : 'Save Activity'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Activity log */}
              <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 h-fit">
                <h2 className="text-gray-900 font-semibold mb-2">Activity Log</h2>
                <p className="text-gray-500 text-xs mb-6 font-medium">
                  Historical timeline of status changes, calls, notes, and messages.
                </p>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <LeadActivityTimeline activities={initialActivities} />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}