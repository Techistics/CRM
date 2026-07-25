'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Edit2, Clock, Calendar as CalendarIcon, FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { saveDiaryAction } from './actions'

type DiaryRow = {
  id: string
  diaryDate: string
  startTime: string
  endTime: string
  content: string
  createdAt: string
}

const diarySchema = z.object({
  id: z.string().optional(),
  diaryDate: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  content: z.string().min(1, 'Note content is required'),
})

export default function ProDiaryClient({ diaries }: { diaries: DiaryRow[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const form = useForm<z.infer<typeof diarySchema>>({
    resolver: zodResolver(diarySchema),
    defaultValues: {
      diaryDate: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '17:00',
      content: '',
    },
  })

  const openForm = (entry?: DiaryRow) => {
    if (entry) {
      setEditingId(entry.id)
      form.reset({
        id: entry.id,
        diaryDate: entry.diaryDate,
        startTime: entry.startTime,
        endTime: entry.endTime,
        content: entry.content,
      })
    } else {
      setEditingId(null)
      form.reset({
        diaryDate: format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '17:00',
        content: '',
      })
    }
    setIsOpen(true)
  }

  const onSubmit = async (values: z.infer<typeof diarySchema>) => {
    toast.loading(editingId ? 'Updating note...' : 'Saving note...', { id: 'diary-save' })
    const res = await saveDiaryAction(values)
    if (res.ok) {
      toast.success(editingId ? 'Note updated!' : 'Note saved!', { id: 'diary-save' })
      setIsOpen(false)
    } else {
      toast.error(res.error || 'Failed to save note', { id: 'diary-save' })
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Notes</h3>
        <Button onClick={() => openForm()} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Note
        </Button>
      </div>

      <div className="grid gap-4">
        {diaries.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No notes found. Create your first diary entry!</p>
          </div>
        ) : (
          diaries.map(d => (
            <div key={d.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">{format(parseISO(d.diaryDate), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">{d.startTime} - {d.endTime}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">Punched: {format(new Date(d.createdAt), 'MMM d, yyyy h:mm a')}</span>
                  <Button variant="ghost" size="icon" onClick={() => openForm(d)} className="h-8 w-8 text-slate-400 hover:text-primary">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
                {d.content}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Note' : 'Add New Note'}</DialogTitle>
            <DialogDescription>
              Log your activities for the selected date and timeframe.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="diaryDate"
                  render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time (24h)</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time (24h)</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What did you work on?" className="min-h-[150px] resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {editingId ? 'Save Changes' : 'Submit Note'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
