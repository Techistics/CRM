import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { sql, and, eq, gte, lte, isNull } from 'drizzle-orm'
import Link from 'next/link'
import { requireTenantSession } from '@/lib/tenant-server'
import { tenantPath } from '@/lib/tenant-path'
import { LEAD_STAGE_LABELS } from '@/lib/lead-stage-labels'
import { Info, MoreHorizontal, ChevronDown } from 'lucide-react'

export default async function ProOverviewPage() {
  const { tenant, dbUserId } = await requireTenantSession()

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, dbUserId))

  if (!dbUser) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Your profile could not be loaded. Try signing out and back in.
      </div>
    )
  }

  const myLeads = await db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      email: leads.email,
      contactNumber: leads.contactNumber,
      city: leads.city,
      stage: leads.stage,
    })
    .from(leads)
    .where(
      and(
        eq(leads.tenantId, tenant.id),
        eq(leads.assignedTo, dbUserId),
      ),
    )

  const activeLeads = myLeads.filter(
    (l) => l.stage !== 'cancelled' && l.stage !== 'paid'
  )
  const followUps = myLeads.filter((l) => l.stage === 'follow_up')

  // Last 7 days daily sparkline
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    d.setHours(0, 0, 0, 0)
    return d
  })

  const sparkRaw = await db.execute(sql`
    SELECT DATE(created_at) as day, COUNT(*) as total
    FROM leads
    WHERE assigned_to = ${dbUserId}
      AND tenant_id = ${tenant.id}
      AND created_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at)
    ORDER BY day ASC
  `)
  const sparkRows = (sparkRaw.rows ?? []) as Array<{ day: string; total: number }>
  const sparkData = last7Days.map((d) => {
    const dateStr = d.toISOString().split('T')[0]
    const row = sparkRows.find((r) => String(r.day).startsWith(dateStr))
    return Number(row?.total ?? 0)
  })

  // Previous 30 days for trend comparison
  const curr30Start = new Date()
  curr30Start.setDate(curr30Start.getDate() - 30)
  const prev30Start = new Date()
  prev30Start.setDate(prev30Start.getDate() - 60)
  const prev30End = new Date()
  prev30End.setDate(prev30End.getDate() - 30)

  const [currStats] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      active: sql<number>`COUNT(*) FILTER (WHERE primary_stage NOT IN ('paid','cancelled'))::int`,
      won: sql<number>`COUNT(*) FILTER (WHERE primary_stage = 'paid')::int`,
    })
    .from(leads)
    .where(and(eq(leads.tenantId, tenant.id), eq(leads.assignedTo, dbUserId), gte(leads.createdAt, curr30Start)))

  const [prevStats] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      active: sql<number>`COUNT(*) FILTER (WHERE primary_stage NOT IN ('paid','cancelled'))::int`,
      won: sql<number>`COUNT(*) FILTER (WHERE primary_stage = 'paid')::int`,
    })
    .from(leads)
    .where(and(eq(leads.tenantId, tenant.id), eq(leads.assignedTo, dbUserId), gte(leads.createdAt, prev30Start), lte(leads.createdAt, prev30End)))

  const calcTrend = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? { value: '+100%', positive: true } : { value: '0%', positive: true }
    const pct = Math.round(((curr - prev) / prev) * 100)
    return { value: `${pct >= 0 ? '+' : ''}${pct}%`, positive: pct >= 0 }
  }

  const trends = {
    total: calcTrend(Number(currStats?.total ?? 0), Number(prevStats?.total ?? 0)),
    active: calcTrend(Number(currStats?.active ?? 0), Number(prevStats?.active ?? 0)),
    followUp: calcTrend(followUps.length, Math.round(Number(prevStats?.active ?? 0) * 0.3)),
    won: calcTrend(Number(currStats?.won ?? 0), Number(prevStats?.won ?? 0)),
  }

  const stageBreakdown = [
    { label: 'New Lead', count: myLeads.filter(l => l.stage === 'new_lead').length, color: '#0ea5e9' },
    { label: 'Follow Up', count: followUps.length, color: '#f59e0b' },
    { label: 'Active', count: activeLeads.length, color: '#10b981' },
    { label: 'Won/Paid', count: myLeads.filter(l => l.stage === 'paid').length, color: '#8b5cf6' },
    { label: 'Cancelled', count: myLeads.filter(l => l.stage === 'cancelled').length, color: '#ef4444' },
  ]

  const metricCards = [
    {
      label: 'My Total Leads',
      value: myLeads.length,
      trend: trends.total,
      sparkColor: '#0ea5e9',
      iconBg: 'bg-sky-50 dark:bg-sky-500/10',
      iconColor: 'text-sky-500',
      icon: '👥',
    },
    {
      label: 'Active',
      value: activeLeads.length,
      trend: trends.active,
      sparkColor: '#10b981',
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
      iconColor: 'text-emerald-500',
      icon: '📈',
    },
    {
      label: 'Follow Ups',
      value: followUps.length,
      trend: trends.followUp,
      sparkColor: '#f59e0b',
      iconBg: 'bg-amber-50 dark:bg-amber-500/10',
      iconColor: 'text-amber-500',
      icon: '⏰',
    },
    {
      label: 'Won',
      value: myLeads.filter(l => l.stage === 'paid').length,
      trend: trends.won,
      sparkColor: '#8b5cf6',
      iconBg: 'bg-violet-50 dark:bg-violet-500/10',
      iconColor: 'text-violet-500',
      icon: '🏆',
    },
  ]

  const fillColors = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

  return (
    <div className="space-y-6">

      {/* ── TOP BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Welcome back, {dbUser.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={tenantPath(tenant.slug, '/pro/leads')}
            className="h-9 gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-4 text-sm rounded-lg flex items-center transition-colors"
          >
            My Leads →
          </Link>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metricCards.map((card) => {
          const max = Math.max(...sparkData, 1)
          return (
            <div key={card.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-crm-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{card.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center flex-shrink-0 text-lg`}>
                  {card.icon}
                </div>
              </div>
              {/* Sparkline bars — matches admin pattern but as vertical bars */}
              <div className="flex items-end gap-0.5 h-9 mb-2">
                {sparkData.map((val, i) => {
                  const h = Math.max(3, Math.round((val / max) * 36))
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm transition-all"
                      style={{
                        height: `${h}px`,
                        background: card.sparkColor,
                        opacity: i === sparkData.length - 1 ? 1 : 0.3 + (i / sparkData.length) * 0.5,
                      }}
                    />
                  )
                })}
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-medium ${card.trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {card.trend.positive ? '↑' : '↓'} {card.trend.value}
                <span className="text-slate-400 dark:text-slate-500 font-normal">vs prev 30d</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── TWO COLUMN LAYOUT ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Left: Pipeline + Recent Leads (2/3) */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-crm-sm overflow-hidden flex flex-col">

          {/* Pipeline header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">My Lead Pipeline</h2>
                <Info className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Breakdown by stage</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-1">
                All time <ChevronDown className="h-3 w-3 opacity-60" />
              </span>
              <button className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Stage bars */}
          <div className="p-6 space-y-3">
            {stageBreakdown.map((stage, idx) => {
              const pct = myLeads.length > 0 ? Math.round((stage.count / myLeads.length) * 100) : 0
              return (
                <div key={stage.label} className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: fillColors[idx] }} />
                  <span className="text-xs text-slate-600 dark:text-slate-300 w-24 truncate flex-shrink-0">{stage.label}</span>
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: fillColors[idx] }} />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 w-5 text-right flex-shrink-0">{stage.count}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-600 w-7 text-right flex-shrink-0">{pct}%</span>
                </div>
              )
            })}
            {myLeads.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No leads assigned yet</p>}
          </div>

          {/* Recent Leads — scrollable, sticky header */}
          <div className="border-t border-slate-200 dark:border-slate-800 flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-6 py-3 flex-shrink-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Recent Leads</p>
              <Link href={tenantPath(tenant.slug, '/pro/leads')} className="text-xs font-medium text-brand hover:text-brand-hover transition-colors">
                View all →
              </Link>
            </div>
            {myLeads.length === 0 ? (
              <div className="px-6 pb-8 text-center text-sm text-slate-400">No leads assigned yet</div>
            ) : (
              <div className="overflow-auto max-h-[300px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Contact</th>
                      <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">City</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Stage</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLeads.map((lead) => (
                      <tr key={lead.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{lead.fullName}</p>
                          {lead.email && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{lead.email}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{lead.contactNumber ?? '—'}</td>
                        <td className="hidden md:table-cell px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{lead.city ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {LEAD_STAGE_LABELS[lead.stage ?? 'new_lead']}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={tenantPath(tenant.slug, `/pro/leads/${lead.id}`)} className="text-xs font-medium text-brand hover:text-brand-hover transition-colors">
                            Details →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Performance + Quick Stats (1/3) */}
        <div className="flex flex-col gap-4">

          {/* My Performance */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-crm-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">My Performance</h2>
              <button className="h-6 w-6 flex items-center justify-center rounded-md text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {[
                {
                  label: 'Conversion Rate',
                  value: myLeads.length > 0 ? Math.round((myLeads.filter(l => l.stage === 'paid').length / myLeads.length) * 100) : 0,
                  color: '#8b5cf6',
                },
                {
                  label: 'Active Rate',
                  value: myLeads.length > 0 ? Math.round((activeLeads.length / myLeads.length) * 100) : 0,
                  color: '#10b981',
                },
                {
                  label: 'Follow-up Rate',
                  value: myLeads.length > 0 ? Math.round((followUps.length / myLeads.length) * 100) : 0,
                  color: '#f59e0b',
                },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{stat.label}</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{stat.value}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${stat.value}%`, background: stat.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-crm-sm overflow-hidden flex-1">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quick Stats</h2>
              <button className="h-6 w-6 flex items-center justify-center rounded-md text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { label: 'Total Assigned', value: myLeads.length, color: '#0ea5e9' },
                { label: 'In Progress', value: activeLeads.length, color: '#10b981' },
                { label: 'Need Follow-up', value: followUps.length, color: '#f59e0b' },
                { label: 'Successfully Won', value: myLeads.filter(l => l.stage === 'paid').length, color: '#8b5cf6' },
                { label: 'Cancelled', value: myLeads.filter(l => l.stage === 'cancelled').length, color: '#ef4444' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-sm text-slate-600 dark:text-slate-300">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}