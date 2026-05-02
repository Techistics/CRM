'use client'

import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

const journeySteps = [
  'Enquiry Received',
  'Consultation Done',
  'Documents Collected',
  'Application Submitted',
  'Offer Received',
  'Visa Applied',
  'Visa Granted',
  'Enrolled ✓',
] as const

type LeadStageValue =
  | 'new_lead'
  | 'unresponsive'
  | 'follow_up'
  | 'docs_received'
  | 'options_sent'
  | 'final_decision'
  | 'walkin_booked'
  | 'walkin_conducted'
  | 'cancelled'
  | 'visa_applied'
  | 'visa_granted'
  | 'paid'

const stageToJourneyStep: Record<LeadStageValue, number> = {
  new_lead: 1,
  unresponsive: 2,
  follow_up: 2,
  walkin_booked: 2,
  walkin_conducted: 2,
  docs_received: 3,
  options_sent: 4,
  final_decision: 5,
  visa_applied: 6,
  visa_granted: 7,
  paid: 8,
  cancelled: 0,
}

const stepToStage: Record<number, LeadStageValue> = {
  1: 'new_lead',
  2: 'follow_up',
  3: 'docs_received',
  4: 'options_sent',
  5: 'final_decision',
  6: 'visa_applied',
  7: 'visa_granted',
  8: 'paid',
}

export function StudentJourney({ 
  stage, 
  onStepClick 
}: { 
  stage: LeadStageValue,
  onStepClick?: (stage: LeadStageValue) => void
}) {
  const isCancelled = stage === 'cancelled'
  const currentStep = stageToJourneyStep[stage]

  if (isCancelled) {
    return (
      <Card className="rounded-xl border shadow-sm p-6">
        <h3 className="text-sm font-semibold mb-2">Student Journey</h3>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
          Not proceeding
        </div>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl border shadow-sm p-6">
      <h3 className="text-sm font-semibold mb-4">Student Journey</h3>
      <div className="relative">
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-border" />
        <div
          className="absolute top-4 left-4 h-0.5 bg-primary transition-all duration-500"
          style={{ width: `${(currentStep / 8) * 100}%` }}
        />

        <div className="relative flex justify-between">
          {journeySteps.map((step, index) => {
            const stepNumber = index + 1
            const isComplete = stepNumber < currentStep
            const isCurrent = stepNumber === currentStep

            return (
              <div key={step} className="flex flex-col items-center gap-2">
                <button
                  onClick={() => onStepClick?.(stepToStage[stepNumber])}
                  disabled={!onStepClick}
                  className={cn(
                    'h-8 w-8 rounded-full border-2 flex items-center justify-center',
                    'text-xs font-bold transition-all duration-300',
                    'hover:scale-110 active:scale-95',
                    isComplete && 'bg-primary border-primary text-white',
                    isCurrent && 'bg-white border-primary text-primary shadow-md',
                    !isComplete && !isCurrent && 'bg-white border-border text-muted-foreground',
                  )}
                >
                  {isComplete || isCurrent ? <Check className="h-4 w-4" /> : stepNumber}
                </button>
                <span
                  className={cn(
                    'text-[10px] text-center max-w-[60px] leading-tight',
                    isCurrent && 'font-semibold text-primary',
                    !isCurrent && 'text-muted-foreground',
                  )}
                >
                  {step}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

