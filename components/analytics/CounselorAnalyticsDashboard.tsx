'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Loader2, Download, FileSpreadsheet, BarChart3, Calendar, ChevronDown, FileText, FileDown } from 'lucide-react'
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

export default function CounselorAnalyticsDashboard({
  tenantSlug: tenantSlugProp,
  leadsPathPrefix = 'admin',
  enableCounselorDrilldownRoute = true,
}: {
  tenantSlug?: string
  leadsPathPrefix?: 'admin' | 'pro'
  enableCounselorDrilldownRoute?: boolean
}) {
  const params = useParams()
  const tenantSlug = tenantSlugProp ?? (params?.tenantSlug as string)

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

  // Computed display value for the CSV generation logic context
  const targetCounselorName = useMemo(() => {
    if (!exportCounselorId) return 'All Counselors'
    const found = summaryData.find((c) => c.userId === exportCounselorId)
    return found ? found.name : 'Unknown Counselor'
  }, [exportCounselorId, summaryData])

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

  // Dropdown open state for the export button
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setExportDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Download CSV report handler (Appends metrics meta metadata queries explicitly for backend CSV stream headers)
  const handleDownloadCSV = () => {
    setExportDropdownOpen(false)
    let url = `/api/analytics/report/export?from=${exportFrom}&to=${exportTo}`
    url += `&counselorName=${encodeURIComponent(targetCounselorName)}`
    if (exportCounselorId) {
      url += `&counselorId=${exportCounselorId}`
    }
    window.open(url, '_blank')
  }

  // Download PDF report handler (client-side, jsPDF branded directly to CRM core design parameters)
  const handleDownloadPDF = async () => {
    setExportDropdownOpen(false)
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const now = new Date()

    // ── Background header band (Slate Dark Matrix Theme #0f172a) ─────────────────────────
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, pageW, 46, 'F')

    // Accent premium keyline stripe (Indigo Accent Brand #4f46e5)
    doc.setFillColor(79, 70, 229)
    doc.rect(0, 44, pageW, 3, 'F')

    // Corporate Core Brand Text Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(255, 255, 255)
    doc.text('Consulty CRM', 14, 18)

    // Report sub-title
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(148, 163, 184) // slate-400
    doc.text('Counselor Performance Analytical Audit', 14, 26)

    // System Metrics and Runtime Meta Frames
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Generated: ${now.toLocaleString()}`, pageW - 14, 18, { align: 'right' })
    doc.text(`Period Range: ${exportFrom}  to  ${exportTo}`, pageW - 14, 25, { align: 'right' })

    // ── Content Core Section Section Titles ──────────────────────────────────────────
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(15, 23, 42) // slate-900
    doc.text(`Analytics Profile Focus: ${targetCounselorName}`, 14, 60)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 116, 139) // slate-500
    doc.text('The summary data vector array block below breaks down tracked operational metrics over the targeted chronological parameters.', 14, 66)

    // ── Filtered active operational data sets ───────────────────────────────────────
    const dataRows = exportCounselorId
      ? summaryData.filter((c) => c.userId === exportCounselorId)
      : summaryData

    const tableBody = dataRows.map((c, idx) => [
      String(idx + 1),
      c.userId,
      c.name,
      c.email,
      String(c.totalLeads ?? 0),
      String(c.activeLeads ?? 0),
      String(c.coldLeads ?? 0),
      String(c.deadLeads ?? 0),
      `${c.todayHours ?? 0}h`,
    ])

    autoTable(doc, {
      startY: 72,
      head: [['#', 'User Unique ID', 'Consultant Name', 'Corporate Email Address', 'Total', 'Active', 'Cold', 'Dead', 'Logged Time']],
      body: tableBody,
      styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 3.5, textColor: [15, 23, 42] },
      headStyles: {
        fillColor: [15, 23, 42], // Slate-900 Base Corporate Head
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] }, // Slate-50 minimal tracking alternate row
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 42, fontSize: 6.5, font: 'courier' },
        2: { cellWidth: 32, fontStyle: 'bold' },
        3: { cellWidth: 42 },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 12, halign: 'center' },
        6: { cellWidth: 12, halign: 'center' },
        7: { cellWidth: 12, halign: 'center' },
        8: { cellWidth: 18, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
      tableLineColor: [226, 232, 240], // slate-200
      tableLineWidth: 0.2,
    })

    // ── Structural Footer Render Loops ──────────────────────────────────────────
    const totalPages = (doc as any).internal.getNumberOfPages()
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p)
      doc.setFillColor(248, 250, 252)
      doc.rect(0, pageH - 12, pageW, 12, 'F')
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text('Confidential Operational Record — Consulty CRM Management Portal', 14, pageH - 4)
      doc.text(`Page ${p} of ${totalPages}`, pageW - 14, pageH - 4, { align: 'right' })
    }

    const fileLabelName = targetCounselorName.replace(/\s+/g, '_')
    doc.save(`Consulty_Analytics_${fileLabelName}_${exportFrom}_to_${exportTo}.pdf`)
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Analytics Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Real-time counselor performance, timesheet tracking, and lead efficiency metrics.
          </p>
        </div>

        {/* Date Filter Panel */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>Date Range:</span>
          </div>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-transparent text-sm border-none focus:ring-0 focus:outline-none text-slate-900 dark:text-slate-100 cursor-pointer font-medium"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-transparent text-sm border-none focus:ring-0 focus:outline-none text-slate-900 dark:text-slate-100 cursor-pointer font-medium"
          />
        </div>
      </div>

      {/* Main Counselor Summary Card */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm rounded-xl">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <CardTitle className="text-xl flex items-center gap-2 text-slate-900 dark:text-slate-50">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            Counselor Performance Summary
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Click a row to drill down into detailed activity logs. Click counter badges to isolate visual target arrays.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingSummary ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : summaryData.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              No counselor metrics data records found inside this chronological parameter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-slate-200 dark:border-slate-800">
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 pl-6">Counselor Name</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Total Leads</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Active Leads</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Cold Leads</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Dead Leads</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Clocked Hours Today</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Edits Today</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryData.map((c) => (
                  <TableRow
                    key={c.userId}
                    className="cursor-pointer border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                    onClick={() => {
                      if (!enableCounselorDrilldownRoute) return
                      router.push(`/t/${tenantSlug}/admin/analytics/${c.userId}?from=${from}&to=${to}&name=${encodeURIComponent(c.name)}&email=${encodeURIComponent(c.email)}`)
                    }}
                  >
                    <TableCell className="font-medium pl-6 text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 font-normal">{c.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium text-slate-700 dark:text-slate-300">{c.totalLeads}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-bold"
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
                        className="text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-bold"
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
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900/60 font-bold"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenLeadsDialog(c.userId, c.name, 'dead')
                        }}
                      >
                        {c.deadLeads}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      <Badge variant="outline" className="px-2.5 py-0.5 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold bg-slate-50 dark:bg-slate-900">
                        {c.todayHours}h
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold text-indigo-600 dark:text-indigo-400">
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
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-xl">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-slate-50">
            <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
            Secure Information Export Matrices
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Compile operational logs directly into encrypted spreadsheet layouts or structured PDFs.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Select Target Consultant</label>
              <select
                value={exportCounselorId}
                onChange={(e) => setExportCounselorId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer font-medium"
              >
                <option value="">All Consultants</option>
                {summaryData.map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Parameters From</label>
              <input
                type="date"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 cursor-pointer font-medium"
              />
            </div>

            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Parameters To</label>
              <input
                type="date"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 cursor-pointer font-medium"
              />
            </div>

            {/* Split export dropdown */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center rounded-lg overflow-hidden border border-slate-900 dark:border-slate-700 shadow-sm">
                {/* Main action button (Slate Premium Theme Brand Trigger) */}
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-950 text-white text-sm font-semibold px-4 py-2 transition-colors"
                >
                  <FileDown className="h-4 w-4" />
                  Download Report
                </button>
                {/* Chevron trigger toggle layout */}
                <button
                  onClick={() => setExportDropdownOpen((v) => !v)}
                  className="flex items-center bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:hover:bg-slate-300 dark:text-slate-900 text-white px-2 py-2 border-l border-slate-700 dark:border-slate-300 transition-colors"
                  aria-label="Format matrices choice selector"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {/* Format selection popover menu */}
              {exportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Compilation Targets</p>
                  </div>
                  <button
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors text-left"
                  >
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-900/30">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">CSV Spreadsheet</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">Includes consultant & range headers</p>
                    </div>
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors text-left"
                  >
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100/50 dark:border-indigo-900/30">
                      <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">PDF Document Report</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">Consulty branded document</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads list dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-900 pb-4 mb-4">
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {dialogType ? dialogType.charAt(0).toUpperCase() + dialogType.slice(1) : ''} Leads — {dialogCounselorName}
            </DialogTitle>
            <DialogDescription className="text-slate-400 dark:text-slate-500 text-xs">
              Isolating structural asset arrays currently assigned to this active workspace profile node.
            </DialogDescription>
          </DialogHeader>

          {loadingDialog ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : dialogLeads.length === 0 ? (
            <p className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">No record vectors inside this filtered perspective frame.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-slate-200 dark:border-slate-800">
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 pl-4">Name</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Email Address</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Stage</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 pr-4 text-right">Created Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dialogLeads.map((l) => (
                  <TableRow key={l.id} className="border-b border-slate-100 dark:border-slate-900/60">
                    <TableCell className="font-semibold pl-4">
                      <Link
                        href={`/t/${tenantSlug}/${leadsPathPrefix}/leads/${l.id}`}
                        onClick={() => setDialogOpen(false)}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                      >
                        {l.fullName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-500 dark:text-slate-400">{l.email || 'No email registered'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="capitalize font-semibold text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-none">
                        {l.stage.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs pr-4 text-slate-400 dark:text-slate-500">
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