'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getLeadRevenues, saveLeadRevenue } from '@/lib/leads/revenue-actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface LeadRevenueCardProps {
  leadId: string
}

export function LeadRevenueCard({ leadId }: LeadRevenueCardProps) {
  const [revenues, setRevenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [intake, setIntake] = useState('')
  const [university, setUniversity] = useState('')
  const [country, setCountry] = useState('')
  const [counselorFee, setCounselorFee] = useState('')
  const [universityFee, setUniversityFee] = useState('')

  useEffect(() => {
    fetchRevenues()
  }, [leadId])

  async function fetchRevenues() {
    try {
      const data = await getLeadRevenues(leadId)
      setRevenues(data)
    } catch (error) {
      console.error('Failed to load revenues', error)
      toast.error('Failed to load revenues')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!intake || !university || !country || !counselorFee || !universityFee) {
      toast.error('Please fill in all fields')
      return
    }

    setSaving(true)
    try {
      await saveLeadRevenue(leadId, {
        intake,
        university,
        country,
        counselorFee: parseFloat(counselorFee),
        universityFee: parseFloat(universityFee),
      })
      toast.success('Revenue saved successfully')
      // Reset form
      setIntake('')
      setUniversity('')
      setCountry('')
      setCounselorFee('')
      setUniversityFee('')
      // Refresh list
      await fetchRevenues()
    } catch (error) {
      console.error('Failed to save revenue', error)
      toast.error('Failed to save revenue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Revenue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="intake">Intake</Label>
              <Input
                id="intake"
                placeholder="e.g. Fall 2024"
                value={intake}
                onChange={(e) => setIntake(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                placeholder="e.g. UK"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="university">University</Label>
            <Input
              id="university"
              placeholder="e.g. Oxford University"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="counselorFee">Counselor Fee</Label>
              <Input
                id="counselorFee"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={counselorFee}
                onChange={(e) => setCounselorFee(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="universityFee">University Fee</Label>
              <Input
                id="universityFee"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={universityFee}
                onChange={(e) => setUniversityFee(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Revenue
          </Button>
        </form>

        <div className="space-y-4 pt-4 border-t">
          <h4 className="text-sm font-medium">Saved Revenues</h4>
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : revenues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No revenues recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {revenues.map((rev) => (
                <div key={rev.id} className="p-3 border rounded-md text-sm space-y-2 bg-muted/20">
                  <div className="flex justify-between items-center font-medium">
                    <span>{rev.university}, {rev.country}</span>
                    <span className="text-muted-foreground text-xs">{rev.intake}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Counselor Fee:</span>
                    <span className="font-medium text-foreground">${Number(rev.counselorFee).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>University Fee:</span>
                    <span className="font-medium text-foreground">${Number(rev.universityFee).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
