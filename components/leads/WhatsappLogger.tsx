'use client'

import { useState } from 'react'
import { MessageCircle, ExternalLink, Sparkles, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TemplateSelector } from '@/components/leads/TemplateSelector'

export function WhatsappLogger({
  leadId,
  tenantSlug,
  leadName,
  leadCountry,
  leadProgramme,
  currentStage,
  leadPhone,
}: {
  leadId: string
  tenantSlug: string
  leadName: string
  leadCountry: string | null
  leadProgramme: string | null
  currentStage: string
  leadPhone: string | null
}) {
  const [message, setMessage] = useState('')

  const handleOpenWhatsapp = () => {
    if (!leadPhone) return
    
    const cleanPhone = leadPhone.replace(/\D/g, '')
    const encodedMessage = encodeURIComponent(message)
    const url = `https://wa.me/${cleanPhone}${encodedMessage ? `?text=${encodedMessage}` : ''}`
    
    window.open(url, '_blank')
  }

  return (
    <div className="w-full pb-12 animate-in fade-in duration-500">
      <div className="bg-[var(--card-bg)] border-[0.5px] border-[var(--card-border-color)] shadow-crm-sm rounded-[12px] overflow-hidden">
        {/* Header Section */}
        <div className="border-b border-[var(--card-border-color)] bg-[var(--main-bg)] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center border border-green-500/20">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[14px] font-medium text-[var(--text-strong)]">WhatsApp Workspace</h2>
              <p className="text-xs text-[var(--muted-text)]">Quickly message {leadName}</p>
            </div>
          </div>
          
          {!leadPhone && (
            <span className="text-[11px] font-semibold text-red-600 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">
              Missing Phone Number
            </span>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Scrollable Template Picker Section */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--muted-text)] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              Select Response Template
            </label>
            
            {/* Scroll Container with defined height */}
            <div className="max-h-[160px] overflow-y-auto pr-1 border border-[var(--card-border-color)] rounded-[8px] p-2 bg-[var(--main-bg)]">
              <TemplateSelector
                leadId={leadId}
                tenantSlug={tenantSlug}
                leadName={leadName}
                leadCountry={leadCountry}
                leadProgramme={leadProgramme}
                currentStage={currentStage}
                onSelect={(msg) => setMessage(msg)}
              />
            </div>
          </div>

          {/* Message Textarea */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--muted-text)]">Custom Message</label>
            <Textarea
              placeholder="Select a template above or type your direct message here..."
              className="min-h-[140px] max-h-[240px] bg-[var(--main-bg)] border-[0.5px] border-[var(--card-border-color)] text-[var(--text-strong)] focus-visible:ring-0 focus-visible:border-[var(--text-strong)] rounded-[8px] resize-y p-3.5 text-xs placeholder:text-[var(--muted-text)]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="bg-[var(--main-bg)] px-6 py-4 border-t border-[var(--card-border-color)] flex items-center justify-between gap-4">
          <p className="text-[11px] font-medium text-[var(--muted-text)] max-w-[60%]">
            Clicking send opens the official WhatsApp chat web/app portal with your compiled text ready.
          </p>
          
          <Button 
            onClick={handleOpenWhatsapp} 
            disabled={!leadPhone}
            className="bg-[#0da2e7] dark:bg-[#0da2e7] hover:bg-[#0a98d1] text-white font-medium shadow-sm gap-2 h-10 px-5 rounded-[8px] text-[13px] transition-colors duration-150"
          >
            <Send className="h-4 w-4" />
            Open WhatsApp Chat
          </Button>
        </div>
      </div>
    </div>
  )
}