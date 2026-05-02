'use client'

import { useState } from 'react'
import { MessageCircle, ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  const [open, setOpen] = useState(false)

  const handleOpenWhatsapp = () => {
    if (!leadPhone) return
    
    // Clean phone number (remove non-digits)
    const cleanPhone = leadPhone.replace(/\D/g, '')
    const encodedMessage = encodeURIComponent(message)
    const url = `https://wa.me/${cleanPhone}${encodedMessage ? `?text=${encodedMessage}` : ''}`
    
    window.open(url, '_blank')
    setOpen(false)
  }

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
      <h2 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
        <span className="w-6 h-6 rounded-md bg-green-50 text-green-600 flex items-center justify-center shadow-sm">
          <MessageCircle className="h-3.5 w-3.5" />
        </span>
        Quick Contact
      </h2>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            className="w-full bg-[#25D366] hover:bg-[#20bd5c] text-white font-semibold gap-2 h-11"
          >
            <MessageCircle className="h-5 w-5" />
            Contact on WhatsApp
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-[#25D366]" />
              WhatsApp Contact
            </DialogTitle>
            <DialogDescription>
              Select a template or type a message to send to <strong>{leadName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!leadPhone && (
              <p className="text-sm text-destructive font-medium">
                No phone number available for this lead.
              </p>
            )}
            
            <TemplateSelector
              leadId={leadId}
              tenantSlug={tenantSlug}
              leadName={leadName}
              leadCountry={leadCountry}
              leadProgramme={leadProgramme}
              currentStage={currentStage}
              onSelect={(msg) => setMessage(msg)}
            />
            
            <div className="space-y-2">
              <Textarea
                placeholder="Type your message here..."
                className="min-h-[120px] resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                This message will be opened in the WhatsApp application.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleOpenWhatsapp} 
              disabled={!leadPhone}
              className="bg-[#25D366] hover:bg-[#20bd5c] text-white gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
