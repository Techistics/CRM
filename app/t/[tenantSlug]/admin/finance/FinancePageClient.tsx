'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Calculator, DollarSign, TrendingUp, Building2, Globe, Loader2,
  ChevronDown, ChevronUp, FileDown, Search, CalendarDays, X, Users, Filter, Info
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'

type RevenueRecord = {
  id: string
  leadId: string
  leadName: string | null
  university: string | null
  country: string | null
  intakeMonth: number | null
  intakeYear: number | null
  counselorFee: string | null
  universityFee: string | null
  slips: any[]
  createdAt: string
  createdByName: string | null
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function FinancePageClient({ tenantSlug }: { tenantSlug: string }) {
  const [records, setRecords] = useState<RevenueRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // ── Filters ─────────────────────────────────────────────────
  const [filterCounselor, setFilterCounselor] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterIntakeYear, setFilterIntakeYear] = useState<string>('all')
  const [filterIntakeMonth, setFilterIntakeMonth] = useState<string>('all')

  // ── Commission Calculator ────────────────────────────────────
  const [applyCounselor, setApplyCounselor] = useState(true)
  const [applyUniversity, setApplyUniversity] = useState(true)
  const [counselorPct, setCounselorPct] = useState('10')
  const [rmPct, setRmPct] = useState('5')

  useEffect(() => { fetchRecords() }, [])

  async function fetchRecords() {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/records')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setRecords(data.records ?? [])
    } catch {
      toast.error('Failed to load finance records')
    } finally {
      setLoading(false)
    }
  }

  // ── Derived Data ─────────────────────────────────────────────
  const counselors = useMemo(() => {
    const names = new Set<string>()
    for (const r of records) if (r.createdByName) names.add(r.createdByName)
    return Array.from(names).sort()
  }, [records])

  const intakeYears = useMemo(() => {
    const years = new Set<number>()
    for (const r of records) if (r.intakeYear) years.add(r.intakeYear)
    return Array.from(years).sort((a, b) => b - a)
  }, [records])

  // ── Apply all filters ────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const fromDate = filterDateFrom ? new Date(filterDateFrom) : null
    const toDate = filterDateTo ? new Date(filterDateTo + 'T23:59:59') : null

    return records.filter(r => {
      if (q && !(
        (r.leadName || '').toLowerCase().includes(q) ||
        (r.country || '').toLowerCase().includes(q) ||
        (r.university || '').toLowerCase().includes(q) ||
        (r.createdByName || '').toLowerCase().includes(q)
      )) return false

      if (filterCounselor !== 'all' && r.createdByName !== filterCounselor) return false
      if (fromDate && new Date(r.createdAt) < fromDate) return false
      if (toDate && new Date(r.createdAt) > toDate) return false
      if (filterIntakeYear !== 'all' && String(r.intakeYear) !== filterIntakeYear) return false
      if (filterIntakeMonth !== 'all' && String(r.intakeMonth) !== filterIntakeMonth) return false

      return true
    })
  }, [records, search, filterCounselor, filterDateFrom, filterDateTo, filterIntakeYear, filterIntakeMonth])

  // ── Summary Stats (on filtered set) ─────────────────────────
  const stats = useMemo(() => {
    let totalCf = 0, totalUf = 0
    const byCountry: Record<string, number> = {}
    const byCounselor: Record<string, number> = {}
    const byYear: Record<string, number> = {}

    for (const r of filtered) {
      const cf = Number(r.counselorFee || 0)
      const uf = Number(r.universityFee || 0)
      totalCf += cf; totalUf += uf
      if (r.country) byCountry[r.country] = (byCountry[r.country] || 0) + cf + uf
      const name = r.createdByName || 'Unknown'
      byCounselor[name] = (byCounselor[name] || 0) + cf + uf
      if (r.intakeYear) byYear[r.intakeYear] = (byYear[r.intakeYear] || 0) + cf + uf
    }
    return { totalCf, totalUf, total: totalCf + totalUf, byCountry, byCounselor, byYear }
  }, [filtered])

  // ── Commission calc (on filtered set) ───────────────────────
  const commissions = useMemo(() => {
    const cPct = parseFloat(counselorPct) || 0
    const rPct = parseFloat(rmPct) || 0
    const result: Record<string, { base: number; counselorComm: number; rmComm: number }> = {}

    for (const r of filtered) {
      const cFee = applyCounselor ? Number(r.counselorFee || 0) : 0
      const uFee = applyUniversity ? Number(r.universityFee || 0) : 0
      const base = cFee + uFee
      const name = r.createdByName || 'Unknown'
      if (!result[name]) result[name] = { base: 0, counselorComm: 0, rmComm: 0 }
      result[name].base += base
      result[name].counselorComm += (base * cPct) / 100
      result[name].rmComm += (base * rPct) / 100
    }
    return result
  }, [filtered, applyCounselor, applyUniversity, counselorPct, rmPct])

  const hasActiveFilters = filterCounselor !== 'all' || filterDateFrom || filterDateTo || filterIntakeYear !== 'all' || filterIntakeMonth !== 'all' || search

  function clearFilters() {
    setFilterCounselor('all')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterIntakeYear('all')
    setFilterIntakeMonth('all')
    setSearch('')
  }

  function exportCSV() {
    const rows = [
      ['Lead', 'Staff (Counselor/RM)', 'University', 'Country', 'Intake', 'Service Charge', 'Uni Commission', 'Total', 'Date'],
      ...filtered.map(r => [
        r.leadName || '',
        r.createdByName || '',
        r.university || '',
        r.country || '',
        r.intakeMonth && r.intakeYear ? `${MONTHS[r.intakeMonth - 1]} ${r.intakeYear}` : '',
        r.counselorFee || '0',
        r.universityFee || '0',
        (Number(r.counselorFee || 0) + Number(r.universityFee || 0)).toFixed(2),
        new Date(r.createdAt).toLocaleDateString(),
      ])
    ]
    const csv = rows.map(row => row.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'finance-records.csv'
    a.click()
  }

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Finance & Revenue
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track revenue, manage commissions, and analyze financial performance.
          </p>
        </div>
        <Button onClick={exportCSV} variant="outline" size="sm" className="bg-white dark:bg-slate-900 gap-2">
          <FileDown className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* ── FILTERS SECTION (Sleek Inline Design) ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Filters</h2>
          {hasActiveFilters && (
            <Button onClick={clearFilters} variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-500 hover:text-red-500">
              Clear all
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="space-y-1.5 lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Search records..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 bg-white dark:bg-slate-900 shadow-sm" />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Select value={filterCounselor} onValueChange={setFilterCounselor}>
              <SelectTrigger className="h-10 bg-white dark:bg-slate-900 shadow-sm">
                <SelectValue placeholder="Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {counselors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Select value={filterIntakeYear} onValueChange={setFilterIntakeYear}>
              <SelectTrigger className="h-10 bg-white dark:bg-slate-900 shadow-sm">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {intakeYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-10 bg-white dark:bg-slate-900 shadow-sm text-slate-500" />
          </div>

          <div className="space-y-1.5">
            <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-10 bg-white dark:bg-slate-900 shadow-sm text-slate-500" />
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: stats.total, color: 'text-emerald-600 dark:text-emerald-400', icon: TrendingUp },
          { label: 'Service Charges', value: stats.totalCf, color: 'text-indigo-600 dark:text-indigo-400', icon: DollarSign },
          { label: 'Uni Commissions', value: stats.totalUf, color: 'text-sky-600 dark:text-sky-400', icon: Building2 },
        ].map((kpi, i) => (
          <Card key={i} className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900/50">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{kpi.label}</p>
                  <p className={`text-2xl font-bold tracking-tight ${kpi.color}`}>
                    ${kpi.value.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <kpi.icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900/50">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Records</p>
                <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {filtered.length}
                </p>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN (Widgets) ── */}
        <div className="space-y-6">
          
          {/* COMMISSION CALCULATOR */}
          <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-indigo-500" />
                  Commission Calculator
                </CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help ml-2"><Info className="w-4 h-4 text-slate-400 hover:text-slate-500 transition-colors" /></span>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={4} className="max-w-xs z-50">
                      <p className="text-sm leading-relaxed">Calculates commission splits based on the currently filtered records. Adjust the percentages below to instantly see the breakdown per staff member.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-slate-600 dark:text-slate-300">Include Service Charge</Label>
                <Switch checked={applyCounselor} onCheckedChange={setApplyCounselor} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-slate-600 dark:text-slate-300">Include Uni Commission</Label>
                <Switch checked={applyUniversity} onCheckedChange={setApplyUniversity} />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500 uppercase tracking-wider">Staff %</Label>
                  <div className="relative">
                    <Input value={counselorPct} onChange={e => setCounselorPct(e.target.value)} type="number" className="pr-7 text-sm font-medium" />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500 uppercase tracking-wider">RM Bonus %</Label>
                  <div className="relative">
                    <Input value={rmPct} onChange={e => setRmPct(e.target.value)} type="number" className="pr-7 text-sm font-medium" />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span>
                  </div>
                </div>
              </div>

              {Object.keys(commissions).length > 0 && (
                <div className="pt-4 space-y-3 border-t border-slate-100 dark:border-slate-800">
                  <Label className="text-xs text-slate-500 uppercase tracking-wider">Payouts</Label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {Object.entries(commissions)
                      .sort(([,a],[,b]) => b.base - a.base)
                      .map(([name, d]) => (
                        <div key={name} className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{name}</p>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Base: ${d.base.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                            <div className="flex gap-3 font-semibold">
                              <span className="text-emerald-600">Staff: ${d.counselorComm.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                              <span className="text-indigo-600">RM: ${d.rmComm.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                            </div>
                          </div>
                        </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* GEOGRAPHY / TIMELINE STATS */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900/50">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> By Country</p>
                <div className="space-y-2">
                  {Object.entries(stats.byCountry).sort(([,a],[,b]) => b - a).slice(0, 5).map(([country, amount]) => (
                    <div key={country} className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400 truncate">{country}</span>
                      <span className="font-medium text-slate-900 dark:text-slate-200">${amount.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                  ))}
                  {Object.keys(stats.byCountry).length === 0 && <span className="text-xs text-slate-400">No data</span>}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900/50">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> By Year</p>
                <div className="space-y-2">
                  {Object.entries(stats.byYear).sort(([a],[b]) => Number(b) - Number(a)).slice(0, 5).map(([year, amount]) => (
                    <div key={year} className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{year}</span>
                      <span className="font-medium text-slate-900 dark:text-slate-200">${amount.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                  ))}
                  {Object.keys(stats.byYear).length === 0 && <span className="text-xs text-slate-400">No data</span>}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>

        {/* ── RIGHT COLUMN (Table) ── */}
        <div className="xl:col-span-2">
          <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900/50 h-full flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-semibold">Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 relative overflow-hidden">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-500">No transactions match your filters.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                      <TableRow className="border-0">
                        <TableHead className="font-medium text-slate-500">Student & Uni</TableHead>
                        <TableHead className="font-medium text-slate-500">Staff</TableHead>
                        <TableHead className="font-medium text-slate-500 text-right">Serv. Charge</TableHead>
                        <TableHead className="font-medium text-slate-500 text-right">Uni Comm.</TableHead>
                        <TableHead className="font-medium text-slate-900 dark:text-slate-100 text-right pr-6">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(r => {
                        const cf = Number(r.counselorFee || 0)
                        const uf = Number(r.universityFee || 0)
                        const slips = Array.isArray(r.slips) ? r.slips : []
                        return (
                          <TableRow key={r.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                            <TableCell className="pl-4 py-3">
                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                {r.leadName ? (
                                  <Link href={`/t/${tenantSlug}/admin/leads/${r.leadId}`} className="hover:underline text-indigo-600 dark:text-indigo-400 font-semibold">
                                    {r.leadName}
                                  </Link>
                                ) : (
                                  '—'
                                )}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">{r.university || '—'} {r.country && `• ${r.country}`}</div>
                            </TableCell>
                            <TableCell className="py-3 text-sm text-slate-600 dark:text-slate-300">
                              {r.createdByName || '—'}
                              <div className="text-xs text-slate-400 mt-0.5">{r.intakeMonth && r.intakeYear ? `${MONTHS[r.intakeMonth - 1]} ${r.intakeYear}` : ''}</div>
                            </TableCell>
                            <TableCell className="py-3 text-right text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                              {cf > 0 ? `$${cf.toLocaleString('en', { minimumFractionDigits: 2 })}` : '—'}
                            </TableCell>
                            <TableCell className="py-3 text-right text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                              {uf > 0 ? `$${uf.toLocaleString('en', { minimumFractionDigits: 2 })}` : '—'}
                            </TableCell>
                            <TableCell className="py-3 text-right pr-4">
                              <div className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                                ${(cf + uf).toLocaleString('en', { minimumFractionDigits: 2 })}
                              </div>
                              {slips.length > 0 && (
                                <div className="flex gap-2 justify-end mt-1">
                                  {slips.map((s: any, i: number) => (
                                    <a key={i} href={s.storageUrl} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-500 hover:text-indigo-600 font-medium">Slip {i+1}</a>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
