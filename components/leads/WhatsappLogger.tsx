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
    <div className="max-w-3xl mx-auto my-6">
      <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
        {/* Header Section */}
        <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shadow-sm border border-green-100">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">WhatsApp Workspace</h2>
              <p className="text-xs text-gray-500">Quickly message {leadName}</p>
            </div>
          </div>
          
          {!leadPhone && (
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
              Missing Phone Number
            </span>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Scrollable Template Picker Section */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              Select Response Template
            </label>
            
            {/* Scroll Container with defined height */}
            <div className="max-h-[160px] overflow-y-auto pr-1 border border-gray-100 rounded-lg p-2 bg-gray-50/30 scrollbar-thin scrollbar-thumb-gray-200">
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
            <label className="text-xs font-medium text-gray-700">Custom Message</label>
            <Textarea
              placeholder="Select a template above or type your direct message here..."
              className="min-h-[140px] max-h-[240px] border-gray-200 focus-visible:ring-indigo-500 rounded-lg resize-y p-3.5 text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
          <p className="text-[11px] text-gray-400 max-w-[60%]">
            Clicking send opens the official WhatsApp chat web/app portal with your compiled text ready.
          </p>
          
          <Button 
            onClick={handleOpenWhatsapp} 
            disabled={!leadPhone}
            className="bg-[#25D366] hover:bg-[#20bd5c] text-white font-medium shadow-sm gap-2 h-10 px-5 rounded-lg transition-colors duration-150"
          >
            <Send className="h-4 w-4" />
            Open WhatsApp Chat
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </Button>
        </div>
      </div>
    </div>
  )
}