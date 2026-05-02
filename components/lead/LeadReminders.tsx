'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { LeadReminder } from '@/types/models'
import { apiCall } from '@/lib/utils/api-handler'
import { cn } from '@/lib/utils'

interface LeadRemindersProps {
  leadId: string
  className?: string
  variant?: 'light' | 'dark'
}

export function LeadReminders({ leadId, className, variant = 'dark' }: LeadRemindersProps) {
  const isDark = variant === 'dark'
  const [reminders, setReminders] = useState<LeadReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function loadReminders() {
      setLoading(true)
      const data = await apiCall(async () => {
        const res = await fetch(`/api/leads/${leadId}/reminders`)
        return res.json()
      }, { errorMsg: 'Failed to load reminders' })
      setReminders((data as { reminders?: LeadReminder[] } | null)?.reminders ?? [])
      setLoading(false)
    }

    loadReminders()
  }, [leadId])

  async function handleCreateReminder() {
    if (!title.trim() || !dueAt || submitting) return
    setSubmitting(true)
    const data = await apiCall(async () => {
      const res = await fetch(`/api/leads/${leadId}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          note: note.trim() || null,
          dueAt: new Date(dueAt).toISOString(),
        }),
      })
      return res.json()
    }, { successMsg: 'Reminder added', errorMsg: 'Could not create reminder' })
    
    if (data) {
      const reminder = (data as { reminder?: LeadReminder }).reminder
      if (reminder) {
        setReminders((prev) => 
          [...prev, reminder].sort((a, b) => +new Date(a.dueAt ?? 0) - +new Date(b.dueAt ?? 0))
        )
      }
      setTitle('')
      setNote('')
      setDueAt('')
    }
    setSubmitting(false)
  }

  async function handleCompleteReminder(reminderId: string) {
    const data = await apiCall(async () => {
      const res = await fetch(`/api/leads/${leadId}/reminders/${reminderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      return res.json()
    }, { successMsg: 'Reminder completed', errorMsg: 'Failed to complete reminder' })
    
    const reminder = (data as { reminder?: LeadReminder } | null)?.reminder
    if (reminder) {
      setReminders((prev) => prev.map((r) => (r.id === reminderId ? reminder : r)))
    }
  }

  return (
    <div className={cn(
      "rounded-2xl p-6 border transition-all duration-300",
      isDark 
        ? "bg-gray-900 border-gray-800 shadow-2xl" 
        : "bg-white border-gray-200 shadow-sm hover:shadow-md",
      className
    )}>
      <h2 className={cn(
        "font-semibold mb-5 flex items-center gap-2",
        isDark ? "text-white" : "text-gray-900"
      )}>
        <span className={cn(
          "w-6 h-6 rounded-md flex items-center justify-center shadow-sm",
          isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"
        )}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        Follow-up Reminders
      </h2>
      
      <div className="space-y-3 mb-6">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Reminder title"
          className={cn(
            "w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2",
            isDark 
              ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-blue-500/20 focus:border-blue-500" 
              : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-blue-500/20 focus:border-blue-500"
          )}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note"
          className={cn(
            "w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2",
            isDark 
              ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-blue-500/20 focus:border-blue-500" 
              : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-blue-500/20 focus:border-blue-500"
          )}
        />
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className={cn(
            "w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2",
            isDark 
              ? "bg-gray-800 border-gray-700 text-white focus:ring-blue-500/20 focus:border-blue-500" 
              : "bg-gray-50 border-gray-200 text-gray-900 focus:ring-blue-500/20 focus:border-blue-500"
          )}
        />
        <button
          onClick={handleCreateReminder}
          disabled={!title.trim() || !dueAt || submitting}
          className="w-full sm:w-auto bg-[#D97706] hover:bg-[#B45309] text-white text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Reminder'}
        </button>
      </div>

      <div className={cn(
        "h-px w-full mb-6",
        isDark ? "bg-gray-800" : "bg-gray-100"
      )} />

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      ) : reminders.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 italic">No reminders scheduled yet.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
          {reminders.map((reminder) => (
            <div 
              key={reminder.id} 
              className={cn(
                "border rounded-xl p-4 transition-all duration-300",
                isDark 
                  ? (reminder.status === 'completed' ? "bg-gray-800/20 border-gray-800/50 opacity-50" : "bg-gray-800/40 border-gray-700 hover:border-gray-600")
                  : (reminder.status === 'completed' ? "bg-gray-50 border-gray-100 opacity-60" : "bg-white border-gray-200 hover:border-gray-300 shadow-sm")
              )}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-semibold truncate",
                    isDark ? "text-white" : "text-gray-900",
                    reminder.status === 'completed' && "line-through opacity-70"
                  )}>
                    {reminder.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={cn(
                      "text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded",
                      reminder.status === 'overdue' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                    )}>
                      {reminder.status === 'completed' ? 'Completed' : (reminder.status === 'overdue' ? 'Overdue' : 'Upcoming')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {reminder.dueAt ? new Date(reminder.dueAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '—'}
                    </span>
                  </div>
                  {reminder.note && (
                    <p className={cn(
                      "text-xs mt-3 leading-relaxed",
                      isDark ? "text-gray-400" : "text-gray-600"
                    )}>
                      {reminder.note}
                    </p>
                  )}
                </div>
                {reminder.status !== 'completed' && (
                  <button
                    onClick={() => handleCompleteReminder(reminder.id)}
                    className="flex-shrink-0 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm active:scale-95"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
