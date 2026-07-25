'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { CalendarIcon, Clock, Search, Filter, FileText } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type AdminDiaryRow = {
  id: string
  counselorName: string
  counselorEmail: string | null
  diaryDate: string
  startTime: string
  endTime: string
  content: string
  createdAt: string
}

type CounselorInfo = {
  id: string
  name: string
  email: string
}

export default function AdminDiaryClient({
  diaries,
  counselors,
  initialFilters,
}: {
  diaries: AdminDiaryRow[]
  counselors: CounselorInfo[]
  initialFilters: { from: string; to: string; counselor: string }
}) {
  const router = useRouter()
  const pathname = usePathname()
  
  const [fromDate, setFromDate] = useState(initialFilters.from.split('T')[0])
  const [toDate, setToDate] = useState(initialFilters.to.split('T')[0])
  const [counselor, setCounselor] = useState(initialFilters.counselor)

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)
    if (counselor && counselor !== 'all') params.set('counselor', counselor)
    
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-auto flex-1 max-w-xs">
          <label className="text-xs font-medium text-slate-500 mb-1.5 block">From Date</label>
          <Input 
            type="date" 
            value={fromDate} 
            onChange={e => setFromDate(e.target.value)} 
          />
        </div>
        <div className="w-full md:w-auto flex-1 max-w-xs">
          <label className="text-xs font-medium text-slate-500 mb-1.5 block">To Date</label>
          <Input 
            type="date" 
            value={toDate} 
            onChange={e => setToDate(e.target.value)} 
          />
        </div>
        <div className="w-full md:w-auto flex-1 max-w-xs">
          <label className="text-xs font-medium text-slate-500 mb-1.5 block">Counselor</label>
          <Select value={counselor} onValueChange={setCounselor}>
            <SelectTrigger>
              <SelectValue placeholder="All Counselors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Counselors</SelectItem>
              {counselors.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={applyFilters} className="gap-2">
          <Search className="w-4 h-4" /> Filter
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {diaries.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No diaries found for this period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                <TableRow>
                  <TableHead>Counselor</TableHead>
                  <TableHead>Diary Date & Time</TableHead>
                  <TableHead>Submission Timestamp</TableHead>
                  <TableHead className="w-1/2">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diaries.map(d => (
                  <TableRow key={d.id} className="group">
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{d.counselorName}</div>
                      <div className="text-xs text-slate-500">{d.counselorEmail}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                        <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                        {format(parseISO(d.diaryDate), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        {d.startTime} - {d.endTime}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {format(new Date(d.createdAt), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-slate-400">
                        {format(new Date(d.createdAt), 'h:mm a')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                        {d.content}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
