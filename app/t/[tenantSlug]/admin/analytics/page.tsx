'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Loader2, Download, User, Clock, FileSpreadsheet, Eye, BarChart3, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type Lead = {
  id: string
  fullName: string
  email: string
  stage: string
  primaryStage: string
  lastContactedAt: string | null
  createdAt: string
}



export default function AdminAnalyticsPage() {
  const params = useParams()
  const tenantSlug = params?.tenantSlug as string

  // Date filters for summary & drilldown
  const todayStr = new Date().toISOString().split('T')[0]
  const [from, setFrom] = useState(todayStr)
  const [to, setTo] = useState(todayStr)

  // Summary list state
  const [summaryData, setSummaryData] = useState<any[]>([])
  const [loadingSummary, setLoadingSummary] = useState(false)

  // Navigation router
  const router = useRouter()

  // Leads list modal dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<'active' | 'cold' | 'dead' | null>(null)
  const [dialogLeads, setDialogLeads] = useState<Lead[]>([])
  const [loadingDialog, setLoadingDialog] = useState(false)
  const [dialogCounselorName, setDialogCounselorName] = useState('')

  // Export section state
  const [exportCounselorId, setExportCounselorId] = useState('')
  const [exportFrom, setExportFrom] = useState(todayStr)
  const [exportTo, setExportTo] = useState(todayStr)

  // Load summary on date range change
  const fetchSummary = async () => {
    setLoadingSummary(true)
    try {
      const res = await fetch(`/api/analytics/summary?from=${from}&to=${to}`)
      if (!res.ok) throw new Error('Failed to fetch summary data')
      const data = await res.json()
      if (Array.isArray(data)) {
        setSummaryData(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSummary(false)
    }
  }

  useEffect(() => {
  if (!tenantSlug) return
  fetchSummary()
  const interval = setInterval(() => {
    fetchSummary()
  }, 30000)
  return () => clearInterval(interval)
}, [tenantSlug, from, to])


  // Open list dialog for active/cold/dead leads counts
  const handleOpenLeadsDialog = async (counselorId: string, name: string, type: 'active' | 'cold' | 'dead') => {
    setDialogCounselorName(name)
    setDialogType(type)
    setDialogOpen(true)
    setLoadingDialog(true)
    try {
      const res = await fetch(`/api/analytics/drilldown?counselorId=${counselorId}&from=${from}&to=${to}`)
      if (!res.ok) throw new Error('Failed to fetch leads list')
      const data = await res.json()
      if (data && data.leads) {
        setDialogLeads(data.leads[type] || [])
      } else {
        setDialogLeads([])
      }
    } catch (err) {
      console.error(err)
      setDialogLeads([])
    } finally {
      setLoadingDialog(false)
    }
  }

  // Download CSV report handler
  const handleDownloadReport = () => {
    let url = `/api/analytics/report/export?from=${exportFrom}&to=${exportTo}`
    if (exportCounselorId) {
      url += `&counselorId=${exportCounselorId}`
    }
    window.open(url, '_blank')
  }



  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time counselor performance, timesheet tracking, and lead efficiency metrics.
          </p>
        </div>

        {/* Date Filter Panel */}
        <div className="flex items-center gap-3 bg-[var(--card-bg-color)] border border-[var(--card-border-color)] rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Date Range:</span>
          </div>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-transparent text-sm border-none focus:ring-0 focus:outline-none text-foreground cursor-pointer font-medium"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-transparent text-sm border-none focus:ring-0 focus:outline-none text-foreground cursor-pointer font-medium"
          />
        </div>
      </div>

      {/* Main Counselor Summary Card */}
      <Card className="border border-[var(--card-border-color)] bg-[var(--card-bg-color)] overflow-hidden shadow-md">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-xl flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            Counselor Performance Summary
          </CardTitle>
          <CardDescription>
            Click a row to drill down into a detailed activity logs viewer. Click counts to view lists.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingSummary ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : summaryData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No counselor data found for this date range.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold pl-6">Counselor Name</TableHead>
                  <TableHead className="font-semibold text-center">Total Leads</TableHead>
                  <TableHead className="font-semibold text-center">Active Leads</TableHead>
                  <TableHead className="font-semibold text-center">Cold Leads</TableHead>
                  <TableHead className="font-semibold text-center">Dead Leads</TableHead>
                  <TableHead className="font-semibold text-center">Clocked Hours Today</TableHead>
                  <TableHead className="font-semibold text-center">Edits Today</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryData.map((c) => (
                  <TableRow
                    key={c.userId}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => router.push(`/t/${tenantSlug}/admin/analytics/${c.userId}?from=${from}&to=${to}&name=${encodeURIComponent(c.name)}&email=${encodeURIComponent(c.email)}`)}
                  >
                    <TableCell className="font-medium pl-6 text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">{c.totalLeads}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-bold"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenLeadsDialog(c.userId, c.name, 'active')
                        }}
                      >
                        {c.activeLeads}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-bold"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenLeadsDialog(c.userId, c.name, 'cold')
                        }}
                      >
                        {c.coldLeads}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenLeadsDialog(c.userId, c.name, 'dead')
                        }}
                      >
                        {c.deadLeads}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      <Badge variant="outline" className="px-2.5 py-0.5 border-indigo-200/50">
                        {c.todayHours}h
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold text-indigo-600 dark:text-indigo-400">
                      {c.todayEdits}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>



      {/* Reports and Export Area */}
      <Card className="border border-[var(--card-border-color)] bg-[var(--card-bg-color)] shadow-md">
        <CardHeader className="border-b bg-muted/10">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
            Export Detailed Reports
          </CardTitle>
          <CardDescription>
            Download counselor activity logs in a spreadsheet CSV file for custom ranges.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Select Counselor</label>
              <select
                value={exportCounselorId}
                onChange={(e) => setExportCounselorId(e.target.value)}
                className="w-full bg-[var(--card-bg-color)] border border-[var(--card-border-color)] rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer font-medium"
              >
                <option value="">All Counselors</option>
                {summaryData.map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">From Date</label>
              <input
                type="date"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
                className="w-full bg-[var(--card-bg-color)] border border-[var(--card-border-color)] rounded-lg px-3 py-1.5 text-sm text-foreground cursor-pointer font-medium"
              />
            </div>

            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">To Date</label>
              <input
                type="date"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
                className="w-full bg-[var(--card-bg-color)] border border-[var(--card-border-color)] rounded-lg px-3 py-1.5 text-sm text-foreground cursor-pointer font-medium"
              />
            </div>

            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 px-6 rounded-lg shadow-sm"
              onClick={handleDownloadReport}
            >
              <Download className="h-4 w-4" />
              Download CSV Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads list dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto border bg-background rounded-xl">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-lg font-bold text-foreground">
              {dialogType ? dialogType.charAt(0).toUpperCase() + dialogType.slice(1) : ''} Leads — {dialogCounselorName}
            </DialogTitle>
            <DialogDescription>
              Displaying the active list of leads assigned to this counselor.
            </DialogDescription>
          </DialogHeader>

          {loadingDialog ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : dialogLeads.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No leads found in this list.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold pl-4">Name</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold text-center">Stage</TableHead>
                  <TableHead className="font-semibold pr-4 text-right">Created Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dialogLeads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-semibold pl-4">
                      <Link
                        href={`/t/${tenantSlug}/admin/leads/${l.id}`}
                        onClick={() => setDialogOpen(false)}
                        className="text-indigo-600 hover:underline font-bold"
                      >
                        {l.fullName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground">{l.email || 'No email'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="capitalize">
                        {l.stage.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs pr-4 text-muted-foreground">
                      {new Date(l.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
