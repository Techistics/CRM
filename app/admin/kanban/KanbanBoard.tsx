'use client'

import { useState } from 'react'
import Link from 'next/link'
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

type KanbanLead = {
  id: string
  fullName: string
  email: string | null
  contactNumber: string | null
  city: string | null
  stage: string | null
  lastQualification: string | null
  assigneeName: string | null
}

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
      className={`bg-gray-800 border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-colors ${
        isBlocked
          ? 'border-red-500/60 bg-red-950/30'
          : 'border-gray-700 hover:border-gray-600'
      }`}
    >
      <p className="text-white text-sm font-medium truncate">{lead.fullName}</p>
      {lead.email && (
        <p className="text-gray-500 text-xs mt-0.5 truncate">{lead.email}</p>
      )}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {lead.city && (
          <span className="text-xs text-gray-500 bg-gray-700/60 px-1.5 py-0.5 rounded">
            {lead.city}
          </span>
        )}
        {lead.lastQualification && (
          <span className="text-xs text-gray-500 bg-gray-700/60 px-1.5 py-0.5 rounded">
            {lead.lastQualification}
          </span>
        )}
      </div>

      {lead.assigneeName ? (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xs">
            {lead.assigneeName.charAt(0)}
          </div>
          <span className="text-xs text-gray-500">{lead.assigneeName}</span>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-1.5">
          <span className={`text-xs ${isBlocked ? 'text-red-400' : 'text-gray-600'}`}>
            {isBlocked ? '✕ Assign first to move' : 'Unassigned'}
          </span>
        </div>
      )}
    </div>
  )
}

function DragCard({ lead }: { lead: KanbanLead }) {
  return (
    <div className="bg-gray-800 border border-emerald-500/40 rounded-lg p-3 shadow-xl rotate-1 w-52">
      <p className="text-white text-sm font-medium truncate">{lead.fullName}</p>
      {lead.email && (
        <p className="text-gray-500 text-xs mt-0.5 truncate">{lead.email}</p>
      )}
    </div>
  )
}

export default function KanbanBoard({
  initialLeads,
}: {
  initialLeads: KanbanLead[]
}) {
  const [leadsState, setLeadsState] = useState<KanbanLead[]>(initialLeads)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [blockedId, setBlockedId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
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
    if (!activeLead?.assigneeName) return // block unassigned

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

    // Block unassigned leads from moving
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
      return
    }

    setActiveId(null)
    setSaving(leadId)

    await fetch(`/api/leads/${leadId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: lead.stage }),
    })

    setSaving(null)
  }

  return (
    <div className="p-8 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Pipeline Board</h1>
          <p className="text-gray-400 text-sm mt-1">
            Drag cards between columns to update stage —{' '}
            <span className="text-gray-600">unassigned leads must be assigned first</span>
          </p>
        </div>
        <div className="flex items-center">
          <Link
            href="/admin/leads"
            className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
          >
            ← List view
          </Link>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageLeads = getLeadsByStage(stage.value)
            return (
              <div
                key={stage.value}
                className={`flex-shrink-0 w-52 bg-gray-900 border border-gray-800 rounded-xl border-t-2 ${stage.color} flex flex-col`}
                style={{ minHeight: '60vh' }}
              >
                <div className="px-3 py-3 border-b border-gray-800">
                  <div className="flex items-center justify-between">
                    <p className="text-white text-xs font-medium">{stage.label}</p>
                    <span className="text-gray-500 text-xs bg-gray-800 px-1.5 py-0.5 rounded-full">
                      {stageLeads.length}
                    </span>
                  </div>
                </div>

                <SortableContext
                  id={stage.value}
                  items={stageLeads.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex-1 p-2 space-y-2 min-h-24">
                    {stageLeads.map((lead) => (
                      <div key={lead.id} className="relative">
                        <LeadCard
                          lead={lead}
                          isDragging={activeId === lead.id}
                          isBlocked={blockedId === lead.id}
                        />
                        {saving === lead.id && (
                          <div className="absolute inset-0 bg-gray-900/60 rounded-lg flex items-center justify-center">
                            <span className="text-xs text-emerald-400">Saving...</span>
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