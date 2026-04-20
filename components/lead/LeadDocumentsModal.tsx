'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { LeadDocumentsPanel } from './LeadDocumentsPanel'
import { FileStack } from 'lucide-react'

interface LeadDocumentsModalProps {
  leadId: string
  trigger?: React.ReactNode
}

export function LeadDocumentsModal({ leadId, trigger }: LeadDocumentsModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <button className="text-[10px] uppercase tracking-wider font-bold text-blue-500 hover:text-blue-400 underline-offset-4 hover:underline transition-all">
            View Documents
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-[#0B0F1A] border-white/10 p-0 overflow-hidden rounded-3xl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-white">
            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <FileStack className="h-4 w-4 text-blue-400" />
            </div>
            Document Manager
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 pt-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <LeadDocumentsPanel leadId={leadId} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
