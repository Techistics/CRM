'use client'

import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useToast } from '@/hooks/use-toast'
import { PIPELINE_STAGES } from '@/constants/pipeline-stages'

import type { KanbanLead } from '@/types/leads'

type BoardStage = { value: string; label: string; color: string }

function fallbackStageColor(value: string) {
  return (
    PIPELINE_STAGES.find((s) => s.value === value)?.kanbanBorder ?? 'border-t-gray-500'
  )
}

function LeadCard({
  lead,
  isDragging = false,
}: {
  lead: KanbanLead
  isDragging?: boolean
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
        !lead.assignedTo
          ? 'border-amber-100 bg-amber-50/30'
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

      {lead.assignedTo ? (
        <div className="mt-1.5 flex items-center gap-1">
          <div className="w-3.5 h-3.5 rounded bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-[8px] shadow-sm">
            {(lead.assigneeName ?? '?').charAt(0)}
          </div>
          <span className="text-[9px] text-gray-600 font-medium truncate">
            {lead.assigneeName ?? 'Assignee'}
          </span>
        </div>
      ) : (
        <div className="mt-1.5 flex items-center gap-1">
          <span className="text-[9px] font-medium text-amber-600 italic">
            Unassigned
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

function KanbanColumn({ 
  id, 
  children 
}: { 
  id: string, 
  children: React.ReactNode 
}) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div 
      ref={setNodeRef} 
      className="flex-1 p-2 space-y-2 overflow-y-auto w-full min-h-[200px]"
    >
      {children}
    </div>
  )
}

export default function KanbanBoard({
  initialLeads,
  baseApiUrl = '/api/leads',
  stages: stagesProp,
}: {
  initialLeads: KanbanLead[]
  baseApiUrl?: string
  stages?: Array<{ key: string; label: string }>
}) {
  const { toast } = useToast()
  const [leadsState, setLeadsState] = useState<KanbanLead[]>(initialLeads)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const stageAtDragStartRef = useRef<string | null>(null)
  const [stages, setStages] = useState<BoardStage[]>(
    (stagesProp ?? []).map((s) => ({
      value: s.key,
      label: s.label,
      color: fallbackStageColor(s.key),
    })),
  )

  // Load stages for this tenant if not provided.
  // This keeps the board workspace-configurable even when rendered in isolation.
  useEffect(() => {
    if (stagesProp && stagesProp.length > 0) return
    ;(async () => {
      try {
        const res = await fetch('/api/pipeline-stages')
        const data = await res.json()
        const rows = (data?.data?.stages ?? data?.stages ?? []) as Array<{ key: string; label: string }>
        if (!rows.length) return
        setStages(
          rows.map((s) => ({
            value: s.key,
            label: s.label,
            color: fallbackStageColor(s.key),
          })),
        )
      } catch {
        // ignore
      }
    })()
  }, [stagesProp])

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
    const id = event.active.id as string
    setActiveId(id)
    const l = leadsState.find((x) => x.id === id)
    stageAtDragStartRef.current = l?.stage ?? 'new_lead'
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    // Find the lead being dragged
    const activeLead = leadsState.find((l) => l.id === activeId)
    if (!activeLead) return

    // Identify target stage
    const overStage = stages.find((s) => s.value === overId)
    const overLead = leadsState.find((l) => l.id === overId)
    const targetStage = overStage ? overStage.value : (overLead?.stage ?? activeLead.stage)

    if (activeLead.stage !== targetStage) {
      setLeadsState((prev) => {
        const activeIndex = prev.findIndex((l) => l.id === activeId)
        const overIndex = prev.findIndex((l) => l.id === overId)
        
        const next = [...prev]
        if (activeIndex !== -1) {
          next[activeIndex] = { ...prev[activeIndex], stage: targetStage }
          return arrayMove(next, activeIndex, overIndex === -1 ? activeIndex : overIndex)
        }
        return prev
      })
    } else if (overId !== activeId) {
      setLeadsState((prev) => {
        const oldIndex = prev.findIndex((l) => l.id === activeId)
        const newIndex = prev.findIndex((l) => l.id === overId)
        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(prev, oldIndex, newIndex)
        }
        return prev
      })
    }
  }

  async function handleDragEnd(_event: DragEndEvent) {
    const leadId = activeId
    setActiveId(null)
    
    if (!leadId) return

    const lead = leadsState.find((l) => l.id === leadId)
    if (!lead) return

    // If the stage changed from the start, or even if it didn't (to ensure reordering if we had reordering persistence), save it.
    const startStage = stageAtDragStartRef.current
    
    // We always set saving to show feedback
    setSaving(leadId)

    try {
      const res = await fetch(`${baseApiUrl}/${leadId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: lead.stage }),
      })

      if (!res.ok) {
        throw new Error('Failed to update stage')
      }

      toast({ 
        title: 'Stage Updated', 
        description: `${lead.fullName} is now in ${stages.find(s => s.value === lead.stage)?.label ?? 'new stage'}.` 
      })
    } catch {
      // Revert state on failure
      const previous = startStage ?? 'new_lead'
      setLeadsState((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: previous } : l)),
      )
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'The card has been moved back. Please check your connection.',
      })
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="p-3 bg-[#F8FAFC] flex flex-col h-full min-h-[calc(100vh-3rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-tight">Pipeline Board</h1>
          <p className="text-gray-500 text-[10px] mt-0.5">
            Drag cards between columns to update stage freely
          </p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-2 overflow-x-auto pb-4 pt-1 select-none flex-1 min-h-0">
          {stages.map((stage) => {
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
                  <KanbanColumn id={stage.value}>
                    {stageLeads.map((lead) => (
                      <div key={lead.id} className="relative">
                        <LeadCard
                          lead={lead}
                          isDragging={activeId === lead.id}
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
                  </KanbanColumn>
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
