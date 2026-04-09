'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useToast } from '@/hooks/use-toast'

const STAGES = [
  { value: 'new_lead',         label: 'New Lead',       color: 'border-t-blue-500' },
  { value: 'unresponsive',     label: 'Unresponsive',   color: 'border-t-gray-500' },
  { value: 'follow_up',        label: 'Follow Up',      color: 'border-t-yellow-500' },
  { value: 'docs_received',    label: 'Docs Received',  color: 'border-t-purple-500' },
  { value: 'options_sent',     label: 'Options Sent',   color: 'border-t-indigo-500' },
  { value: 'final_decision',   label: 'Final Decision', color: 'border-t-orange-500' },
  { value: 'walkin_booked',    label: 'Walk-in Booked', color: 'border-t-teal-500' },
  { value: 'walkin_conducted', label: 'Walk-in Done',   color: 'border-t-cyan-500' },
  { value: 'cancelled',        label: 'Cancelled',      color: 'border-t-red-500' },
  { value: 'paid',             label: 'Paid',           color: 'border-t-emerald-500' },
]

import type { KanbanLead } from '@/types/leads'

function LeadCard({
  lead,
  isDragging = false,
  isBlocked = false,
}: {
  lead: KanbanLead
  isDragging?: boolean
  isBlocked?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white border rounded-lg p-2 cursor-grab active:cursor-grabbing shadow-sm transition-all ${
        isBlocked
          ? 'border-red-400 bg-red-50/50'
          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
      }`}
    >
      <p className="text-gray-900 text-[11px] font-bold tracking-tight truncate leading-tight">{lead.fullName}</p>
      {lead.email && (
        <p className="text-gray-500 text-[9px] mt-0.5 truncate font-medium">{lead.email}</p>
      )}
      <div className="flex items-center gap-1 mt-1 flex-wrap">
        {lead.city && (
          <span className="text-[8px] text-gray-600 bg-gray-50 border border-gray-200 px-1 py-[1px] rounded flex-shrink-0 font-medium whitespace-nowrap">
            {lead.city}
          </span>
        )}
        {lead.lastQualification && (
          <span className="text-[8px] text-gray-600 bg-gray-50 border border-gray-200 px-1 py-[1px] rounded flex-shrink-0 font-medium whitespace-nowrap">
            {lead.lastQualification}
          </span>
        )}
      </div>

      {lead.assigneeName ? (
        <div className="mt-1.5 flex items-center gap-1">
          <div className="w-3.5 h-3.5 rounded bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-[8px] shadow-sm">
            {lead.assigneeName.charAt(0)}
          </div>
          <span className="text-[9px] text-gray-600 font-medium truncate">{lead.assigneeName}</span>
        </div>
      ) : (
        <div className="mt-1.5 flex items-center gap-1">
          <span className={`text-[9px] font-semibold ${isBlocked ? 'text-red-500' : 'text-gray-400'}`}>
            {isBlocked ? '✕ Assign first' : 'Unassigned'}
          </span>
        </div>
      )}
    </div>
  )
}

function DragCard({ lead }: { lead: KanbanLead }) {
  return (
    <div className="bg-white border border-blue-400 rounded-lg p-2 shadow-xl rotate-3 w-40 scale-105">
      <p className="text-gray-900 text-[11px] font-bold truncate leading-tight">{lead.fullName}</p>
      {lead.email && (
        <p className="text-gray-500 text-[9px] mt-0.5 truncate font-medium">{lead.email}</p>
      )}
    </div>
  )
}

export default function KanbanBoard({
  initialLeads,
  baseApiUrl = '/api/leads',
}: {
  initialLeads: KanbanLead[]
  baseApiUrl?: string
}) {
  const { toast } = useToast()
  const [leadsState, setLeadsState] = useState<KanbanLead[]>(initialLeads)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [blockedId, setBlockedId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const activeLead = activeId
    ? leadsState.find((l) => l.id === activeId)
    : null

  function getLeadsByStage(stage: string) {
    return leadsState.filter((l) => (l.stage ?? 'new_lead') === stage)
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeLeadId = active.id as string
    const overId = over.id as string

    const activeLead = leadsState.find((l) => l.id === activeLeadId)
    // block unassigned from drag overs
    if (!activeLead?.assigneeName) return 

    const overStage = STAGES.find((s) => s.value === overId)
    if (overStage) {
      setLeadsState((prev) =>
        prev.map((l) =>
          l.id === activeLeadId ? { ...l, stage: overStage.value } : l
        )
      )
    } else {
      const overLead = leadsState.find((l) => l.id === overId)
      if (overLead?.stage) {
        setLeadsState((prev) =>
          prev.map((l) =>
            l.id === activeLeadId ? { ...l, stage: overLead.stage } : l
          )
        )
      }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) {
      setActiveId(null)
      return
    }

    const leadId = active.id as string
    const lead = leadsState.find((l) => l.id === leadId)
    if (!lead) return

    // Block unassigned leads from completing drop
    if (!lead.assigneeName) {
      setLeadsState((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? { ...l, stage: initialLeads.find((il) => il.id === leadId)?.stage ?? l.stage }
            : l
        )
      )
      setActiveId(null)
      setBlockedId(leadId)
      setTimeout(() => setBlockedId(null), 2000)
      toast({ variant: 'destructive', title: 'Action Blocked', description: 'Assign lead first before moving.' })
      return
    }

    setActiveId(null)
    setSaving(leadId)

    const res = await fetch(`${baseApiUrl}/${leadId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: lead.stage }),
    })
    
    if (res.ok) {
      toast({ title: 'Stage Updated', description: `${lead.fullName} moved to section.` })
    }

    setSaving(null)
  }

  return (
    <div className="p-3 bg-[#F8FAFC] flex flex-col h-full min-h-[calc(100vh-3rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-tight">Pipeline Board</h1>
          <p className="text-gray-500 text-[10px] mt-0.5">
            Drag cards between columns to update stage —{' '}
            <span className="font-semibold text-gray-600">unassigned leads must be assigned first</span>
          </p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-2 overflow-x-auto pb-4 pt-1 select-none flex-1 min-h-0">
          {STAGES.map((stage) => {
            const stageLeads = getLeadsByStage(stage.value)
            return (
              <div
                key={stage.value}
                className={`flex-shrink-0 w-[180px] bg-gray-50/80 border border-gray-200 rounded-lg border-t-2 ${stage.color} flex flex-col shadow-sm`}
              >
                <div className="px-2.5 py-1.5 border-b border-gray-200 bg-white/50 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-900 text-[11px] font-bold tracking-tight">{stage.label}</p>
                    <span className="text-gray-600 text-[9px] font-bold bg-white border border-gray-200 shadow-sm px-1 py-[1px] rounded">
                      {stageLeads.length}
                    </span>
                  </div>
                </div>

                <SortableContext
                  id={stage.value}
                  items={stageLeads.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto w-full">
                    {stageLeads.map((lead) => (
                      <div key={lead.id} className="relative">
                        <LeadCard
                          lead={lead}
                          isDragging={activeId === lead.id}
                          isBlocked={blockedId === lead.id}
                        />
                        {saving === lead.id && (
                          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] rounded-lg flex items-center justify-center border border-gray-100 object-cover z-10 transition-opacity">
                            <span className="text-[9px] font-bold text-blue-600 flex items-center gap-1">
                              <svg className="animate-spin h-3 w-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                               Saving
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {activeLead ? <DragCard lead={activeLead} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
