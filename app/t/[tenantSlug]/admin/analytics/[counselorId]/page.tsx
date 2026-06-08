'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Loader2, User, Clock, TrendingUp, CheckCircle2, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

type Lead = {
  id: string
  fullName: string
  email: string
  stage: string
  primaryStage: string
  lastContactedAt: string | null
  createdAt: string
}

type DrilldownPayload = {
  punchInToday: string | null
  totalHours: number
  leads: {
    touchedToday: Lead[]
    cold: Lead[]
    dead: Lead[]
    active: Lead[]
  }
  activityGraph: Array<{ date: string; count: number }>
}

export default function CounselorDrilldownPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const tenantSlug = params?.tenantSlug as string
  const counselorId = params?.counselorId as string
  
  const from = searchParams?.get('from') || new Date().toISOString().split('T')[0]
  const to = searchParams?.get('to') || new Date().toISOString().split('T')[0]
  const counselorName = searchParams?.get('name') || 'Counselor'
  const counselorEmail = searchParams?.get('email') || ''

  const [drilldownData, setDrilldownData] = useState<DrilldownPayload | null>(null)
  const [loadingDrilldown, setLoadingDrilldown] = useState(true)

  const [localFrom, setLocalFrom] = useState(from)
  const [localTo, setLocalTo] = useState(to)

  const [consultantLogs, setConsultantLogs] = useState<any[]>([])
  const [consultantLogsLoading, setConsultantLogsLoading] = useState(false)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  const fetchConsultantLogs = async () => {
    setConsultantLogsLoading(true)
    try {
      const res = await fetch(`/api/logs?userId=${counselorId}&from=${from}&to=${to}`)
      const data = await res.json()
      setConsultantLogs(data ?? [])
    } catch { setConsultantLogs([]) }
    finally { setConsultantLogsLoading(false) }
  }

  useEffect(() => {
    if (counselorId) fetchConsultantLogs()
  }, [counselorId, from, to])

  useEffect(() => {
    if (!counselorId || !tenantSlug) return
    const fetchDrilldown = async () => {
      setLoadingDrilldown(true)
      try {
        const res = await fetch(`/api/analytics/drilldown?counselorId=${counselorId}&from=${from}&to=${to}`)
        if (!res.ok) throw new Error('Failed to fetch drilldown data')
        const data = await res.json()
        if (data && !data.error) {
          setDrilldownData(data)
        }
      } catch (err) {
        console.error(err)
        setDrilldownData(null)
      } finally {
        setLoadingDrilldown(false)
      }
    }
    fetchDrilldown()
  }, [counselorId, tenantSlug, from, to])

  const chartPoints = useMemo(() => {
    if (!drilldownData || !drilldownData.activityGraph || drilldownData.activityGraph.length === 0) {
      return []
    }
    const maxVal = Math.max(...drilldownData.activityGraph.map((g) => g.count)) || 1
    const height = 150
    const width = 500
    const paddingX = 40
    const paddingY = 20

    return drilldownData.activityGraph.map((g, i) => {
      const x = paddingX + (i / 29) * (width - 2 * paddingX)
      const y = height - paddingY - (g.count / maxVal) * (height - 2 * paddingY)
      return { x, y, date: g.date, count: g.count }
    })
  }, [drilldownData])

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="mb-6">
        <Link
          href={`/t/${tenantSlug}/admin/analytics?from=${from}&to=${to}`}
          className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors font-medium flex items-center gap-1 mb-4"
        >
          ← Back to Analytics
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-lg">
            {counselorName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              {counselorName}
              <Badge variant="outline" className="text-xs font-normal text-muted-foreground ml-2">
                {counselorEmail}  
              </Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className="text-sm text-muted-foreground">Viewing data from</span>
              <input
                type="date"
                value={localFrom}
                onChange={(e) => {
                  setLocalFrom(e.target.value)
                  router.push(`/t/${tenantSlug}/admin/analytics/${counselorId}?from=${e.target.value}&to=${localTo}&name=${encodeURIComponent(counselorName)}&email=${encodeURIComponent(counselorEmail)}`)
                }}
                className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <input
                type="date"
                value={localTo}
                onChange={(e) => {
                  setLocalTo(e.target.value)
                  router.push(`/t/${tenantSlug}/admin/analytics/${counselorId}?from=${localFrom}&to=${e.target.value}&name=${encodeURIComponent(counselorName)}&email=${encodeURIComponent(counselorEmail)}`)
                }}
                className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
        </h1>
      </div>

      <Card className="border border-[var(--card-border-color)] bg-[var(--card-bg-color)] shadow-md">
        <CardHeader className="border-b bg-muted/10">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-500" />
            Drilldown Detailed Viewer
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {loadingDrilldown ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : !drilldownData ? (
            <p className="text-muted-foreground text-center">Failed to load detailed performance metrics.</p>
          ) : (
            <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Stats card */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/10 dark:to-purple-950/10 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl p-5 space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Earliest Punch-In Today</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-indigo-600" />
                      <span className="font-semibold text-foreground">
                        {drilldownData.punchInToday
                          ? new Date(drilldownData.punchInToday).toLocaleTimeString()
                          : 'Not punched in today'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Clocked Hours (Range)</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-indigo-600" />
                      <span className="font-semibold text-foreground">{drilldownData.totalHours} hours</span>
                    </div>
                  </div>
                </div>

                {/* Touched leads list */}
                <div className="border rounded-xl p-4 space-y-3">
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5 border-b pb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Leads Touched in Range ({drilldownData.leads.touchedToday.length})
                  </h3>
                  {drilldownData.leads.touchedToday.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No leads touched by counselor in this period.</p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {drilldownData.leads.touchedToday.map((l) => (
                        <div key={l.id} className="flex justify-between items-center bg-muted/20 p-2.5 rounded-lg border border-border/40 hover:bg-muted/40 transition-colors">
                          <Link
                            href={`/t/${tenantSlug}/admin/leads/${l.id}`}
                            className="text-xs text-indigo-600 hover:underline font-semibold"
                          >
                            {l.fullName}
                          </Link>
                          <Badge variant="secondary" className="text-[10px] scale-90">
                            {l.stage.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right 30-Day Graph card */}
              <div className="lg:col-span-2 border rounded-xl p-5 space-y-4 flex flex-col">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-indigo-500" />
                      30-Day Edit Activity History
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Total saves/updates daily</p>
                  </div>
                </div>

                {/* Premium SVG chart representation */}
                {chartPoints.length > 0 ? (
                  <div className="flex-1 flex flex-col justify-center items-center">
                    <svg viewBox="0 0 500 150" className="w-full h-44 mt-2 overflow-visible">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      <line x1="40" y1="20" x2="460" y2="20" stroke="rgba(156, 163, 175, 0.15)" strokeDasharray="3,3" />
                      <line x1="40" y1="65" x2="460" y2="65" stroke="rgba(156, 163, 175, 0.15)" strokeDasharray="3,3" />
                      <line x1="40" y1="110" x2="460" y2="110" stroke="rgba(156, 163, 175, 0.15)" strokeDasharray="3,3" />
                      <line x1="40" y1="130" x2="460" y2="130" stroke="rgba(156, 163, 175, 0.3)" />

                      {/* Gradient Area under line */}
                      <path
                        d={`M ${chartPoints[0].x} 130 ${chartPoints.map((p) => `L ${p.x} ${p.y}`).join(' ')} L ${chartPoints[chartPoints.length - 1].x} 130 Z`}
                        fill="url(#chartGradient)"
                      />

                      {/* Trend path */}
                      <path
                        d={chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                        fill="none"
                        stroke="rgb(99, 102, 241)"
                        strokeWidth="2.5"
                      />

                      {/* Circles for nodes */}
                      {chartPoints.map((p, i) => (
                        <g key={i} className="group cursor-pointer">
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="3.5"
                            fill="rgb(99, 102, 241)"
                            className="transition-all hover:r-5 hover:fill-indigo-400"
                          />
                          <title>{`${p.date}: ${p.count} edits`}</title>
                        </g>
                      ))}
                    </svg>
                    {/* X-axis labels */}
                    <div className="flex justify-between w-full px-10 text-[10px] text-muted-foreground mt-1 font-semibold">
                      <span>{chartPoints[0]?.date}</span>
                      <span>{chartPoints[Math.floor(chartPoints.length / 2)]?.date}</span>
                      <span>{chartPoints[chartPoints.length - 1]?.date}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                    No graph data available.
                  </div>
                )}
              </div>
            </div>

            {/* Consultant Logs Section */}
            <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                Consultant Logs
              </h3>
              {consultantLogsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : consultantLogs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No logs in this period</p>
              ) : (
                <div className="space-y-3">
                  {consultantLogs.map(log => (
                    <div key={log.id} className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          log.type === 'call' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                          log.type === 'message' ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400' :
                          'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400'
                        }`}>
                          {log.type}
                        </span>
                        <Link href={`/t/${tenantSlug}/admin/leads/${log.leadId}`} className="text-sm font-medium text-sky-600 hover:underline">
                          {log.leadFullName}
                        </Link>
                        <span className="text-xs text-slate-400 ml-auto">
                          {format(new Date(log.createdAt), 'MMM d, yyyy · h:mm a')}
                        </span>
                      </div>
                      <p 
                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        className={`text-sm text-slate-700 dark:text-slate-300 cursor-pointer ${expandedLogId === log.id ? '' : 'line-clamp-2'}`}
                      >
                        {log.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
