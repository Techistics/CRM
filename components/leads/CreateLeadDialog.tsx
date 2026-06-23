'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Loader2, AlertCircle } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { apiCall } from '@/lib/utils/api-handler'

import { COUNTRIES, SOURCES, CURRENCIES } from '@/constants/lead-options'

const createLeadSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  contactNumber: z.string().trim().min(7, 'Contact must be at least 7 characters').max(20),
  email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
  city: z.string().trim().optional().nullable(),
  country: z.string().min(1, 'Country is required'),
  source: z.string().min(1, 'Source is required'),
  stage: z.string().min(1),
  assignedTo: z.string().uuid().optional().nullable(),
  dealValue: z.number().nullable().optional(),
  dealCurrency: z.string().min(3).max(3),
  notes: z.string().trim().max(500).optional().nullable(),
  intakeMonth: z.string().trim().optional().nullable(),
  destinationCountry: z.string().trim().optional().nullable(),
  programOfInterest: z.string().trim().optional().nullable(),
})

type FormValues = z.infer<typeof createLeadSchema>

interface Agent {
  userId: string
  name: string
  email: string
  role: string
  activeLeadCount: number
}

export function CreateLeadDialog({
  tenantSlug,
  showPaymentFields = false,
}: {
  tenantSlug: string
  showPaymentFields?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [pipelineStages, setPipelineStages] = useState<Array<{ key: string; label: string }>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [conflict, setConflict] = useState<boolean>(false)
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      fullName: '',
      contactNumber: '',
      email: '',
      city: '',
      country: 'Pakistan',
      source: 'Walk-in',
      stage: 'new_lead',
      assignedTo: null,
      dealValue: null,
      dealCurrency: 'PKR',
      notes: '',
    },
  })

  const fetchAgents = useCallback(async () => {
    setLoadingAgents(true)
    try {
      const res = await fetch(`/api/admin/team-members?tenantSlug=${tenantSlug}`)
      if (res.ok) {
        const data = await res.json()
        setAgents(data.data?.members || [])
      }
    } catch (err) {
      console.error('Failed to fetch agents', err)
    } finally {
      setLoadingAgents(false)
    }
  }, [tenantSlug])

  useEffect(() => {
    if (open) {
      fetchAgents()
      ;(async () => {
        try {
          const res = await fetch('/api/pipeline-stages')
          const data = await res.json()
          const stages = (data?.data?.stages ?? data?.stages ?? []) as Array<{ key: string; label: string }>
          setPipelineStages(stages)
        } catch {
          setPipelineStages([])
        }
      })()
    } else {
      setConflict(false)
      form.reset()
    }
  }, [open, fetchAgents, form])


  async function onSubmit(values: FormValues, force = false) {
    setIsSubmitting(true)
    const result = await apiCall(async () => {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, force }),
      })

      if (res.status === 409) {
        setConflict(true)
        return { conflict: true as const }
      }

      const data = await res.json()
      return { conflict: false as const, data }
    }, {
      successMsg: force ? 'Lead created' : 'Lead created successfully',
      errorMsg: 'Failed to create lead. Please try again.',
    })

    if (result && !('conflict' in result && result.conflict)) {
      setOpen(false)
      router.refresh()
    }
    setIsSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="gap-1.5 border border-[#b7df65] bg-[#0DA2E7] text-[#1A2B40] shadow-sm hover:bg-[#bfe873] hover:text-[#1A2B40] hover:shadow-md transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          New Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#223955]">Add New Lead</DialogTitle>
          <DialogDescription>Fill in the lead&apos;s details below.</DialogDescription>
        </DialogHeader>

        {conflict && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Duplicate Detected</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>A lead with this contact number or email already exists.</p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setConflict(false)}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => onSubmit(form.getValues(), true)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Create Anyway
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => onSubmit(v, false))} className="grid grid-cols-2 gap-4">
            {/* Full Name */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Full Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Number */}
            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number*</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+92..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* City */}
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="Lahore" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Country */}
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COUNTRIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Source */}
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SOURCES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Stage */}
            <FormField
              control={form.control}
              name="stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(pipelineStages.length > 0 ? pipelineStages : [{ key: 'new_lead', label: 'New Lead' }]).map((s) => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assigned To */}
            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(val === 'unassigned' ? null : val)} 
                    defaultValue={field.value || 'unassigned'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        {loadingAgents ? (
                          <div className="flex items-center">
                            <Loader2 className="h-3 w-3 animate-spin" />
                          </div>
                        ) : (
                          <SelectValue placeholder="Select counselor" />
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {agents.map(a => (
                        <SelectItem key={a.userId} value={a.userId}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showPaymentFields && (
              <>
            {/* Deal Value */}
            <FormField
              control={form.control}
              name="dealValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Value</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Deal Currency */}
            <FormField
              control={form.control}
              name="dealCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="PKR" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
              </>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional details..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Intake */}
            <FormField
              control={form.control}
              name="intakeMonth"
              render={({ field }) => (
                <FormItem className="col-span-1">
                  <FormLabel>Intake</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Sep 2026" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Destination Country */}
            <FormField
              control={form.control}
              name="destinationCountry"
              render={({ field }) => (
                <FormItem className="col-span-1">
                  <FormLabel>Destination Country</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Canada" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Program of Interest */}
            <FormField
              control={form.control}
              name="programOfInterest"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Program of Interest</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. MBA" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="col-span-2 w-full bg-[#223955] hover:bg-[#1a2b40] mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Create Lead'
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
