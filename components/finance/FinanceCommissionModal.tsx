'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Calculator, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function FinanceCommissionModal({ tenantSlug }: { tenantSlug: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Inputs
  const [applyCounselor, setApplyCounselor] = useState(true)
  const [applyUniversity, setApplyUniversity] = useState(true)
  const [counselorPct, setCounselorPct] = useState('10')
  const [rmPct, setRmPct] = useState('5')
  
  // Output
  const [commissionByCounselor, setCommissionByCounselor] = useState<Record<string, { counselorComm: number, rmComm: number, totalBase: number }>>({})

  useEffect(() => {
    if (open) {
      calculateCommissions()
    }
  }, [open, applyCounselor, applyUniversity, counselorPct, rmPct])

  async function calculateCommissions() {
    setLoading(true)
    try {
      // Fetch revenues via summary API (we added counselor fee and univ fee there)
      const res = await fetch(`/api/analytics/summary`)
      if (!res.ok) throw new Error('Failed to fetch data')
      const data = await res.json()
      
      const cPct = parseFloat(counselorPct) || 0
      const rPct = parseFloat(rmPct) || 0

      // We need to fetch the raw revenue records to calculate per counselor
      // Since we don't have a raw list endpoint yet, let's create a quick API fetch or rely on an existing one
      const rawRes = await fetch(`/api/finance/revenues`)
      if (!rawRes.ok) throw new Error('Failed to fetch raw revenues')
      const rawData = await rawRes.json()

      const results: Record<string, { counselorComm: number, rmComm: number, totalBase: number }> = {}

      for (const rev of rawData) {
        const cFee = applyCounselor ? Number(rev.counselorFee || 0) : 0
        const uFee = applyUniversity ? Number(rev.universityFee || 0) : 0
        const base = cFee + uFee

        const counselor = rev.counselorName || rev.createdBy || 'Unknown'
        
        if (!results[counselor]) {
          results[counselor] = { counselorComm: 0, rmComm: 0, totalBase: 0 }
        }

        results[counselor].totalBase += base
        results[counselor].counselorComm += (base * cPct) / 100
        results[counselor].rmComm += (base * rPct) / 100
      }

      setCommissionByCounselor(results)
    } catch (err) {
      console.error(err)
      toast.error('Failed to calculate commissions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700">
          <Calculator className="h-4 w-4" />
          Commission Calculator
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Global Commission Calculator</DialogTitle>
          <DialogDescription>
            Dynamically calculate commissions for Counselors and RMs across all leads.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4 border-b pb-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="apply-counselor" className="cursor-pointer">Apply on Counselor Fee</Label>
                <Switch id="apply-counselor" checked={applyCounselor} onCheckedChange={setApplyCounselor} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="apply-univ" className="cursor-pointer">Apply on University Fee</Label>
                <Switch id="apply-univ" checked={applyUniversity} onCheckedChange={setApplyUniversity} />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-[1fr_80px] items-center gap-2">
                <Label htmlFor="counselor-pct">Counselor %</Label>
                <div className="relative">
                  <Input id="counselor-pct" value={counselorPct} onChange={(e) => setCounselorPct(e.target.value)} type="number" className="pr-6" />
                  <span className="absolute right-2 top-2.5 text-xs text-muted-foreground">%</span>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_80px] items-center gap-2">
                <Label htmlFor="rm-pct">RM %</Label>
                <div className="relative">
                  <Input id="rm-pct" value={rmPct} onChange={(e) => setRmPct(e.target.value)} type="number" className="pr-6" />
                  <span className="absolute right-2 top-2.5 text-xs text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Calculated Commissions</h4>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : Object.keys(commissionByCounselor).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No revenues found or percentages are 0.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(commissionByCounselor).map(([counselor, data]) => (
                  <div key={counselor} className="flex justify-between items-center p-3 border rounded-lg bg-slate-50 dark:bg-slate-900 text-sm">
                    <div className="font-medium">{counselor}</div>
                    <div className="flex gap-6 text-right">
                      <div>
                        <div className="text-xs text-muted-foreground">Base</div>
                        <div className="font-medium">${data.totalBase.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Counselor</div>
                        <div className="font-semibold text-emerald-600">${data.counselorComm.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">RM</div>
                        <div className="font-semibold text-indigo-600">${data.rmComm.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
