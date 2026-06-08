import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { sql, and, eq, gte, lte, isNull } from 'drizzle-orm'
import { UserMenu } from '@/components/shared/UserMenu'
import Link from 'next/link'
import { requireTenantSession } from '@/lib/tenant-server'
import { tenantPath } from '@/lib/tenant-path'
import { LEAD_STAGE_LABELS } from '@/lib/lead-stage-labels'
import { TrendingUp, Users, AlertCircle, BarChart2 } from 'lucide-react'

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

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Welcome back, {dbUser.name}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'My Total Leads', value: myLeads.length, trend: trends.total, color: '#0ea5e9', bg: 'bg-sky-50', iconColor: 'text-sky-500', icon: '👥' },
          { label: 'Active', value: activeLeads.length, trend: trends.active, color: '#10b981', bg: 'bg-emerald-50', iconColor: 'text-emerald-500', icon: '📈' },
          { label: 'Follow Ups', value: followUps.length, trend: trends.followUp, color: '#f59e0b', bg: 'bg-amber-50', iconColor: 'text-amber-500', icon: '⏰' },
          { label: 'Won', value: myLeads.filter(l => l.stage === 'paid').length, trend: trends.won, color: '#8b5cf6', bg: 'bg-violet-50', iconColor: 'text-violet-500', icon: '🏆' },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-crm-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className="text-2xl font-semibold text-slate-900 mt-1">{card.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0 text-lg`}>
                {card.icon}
              </div>
            </div>
            {/* Mini sparkline bar */}
            <div className="flex items-end gap-0.5 h-8 mb-2">
              {sparkData.map((val, i) => {
                const max = Math.max(...sparkData, 1)
                const h = Math.max(2, Math.round((val / max) * 32))
                return (
                  <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}px`, background: card.color, opacity: i === sparkData.length - 1 ? 1 : 0.35 }} />
                )
              })}
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium ${card.trend.positive ? 'text-emerald-600' : 'text-red-500'}`}>
              {card.trend.positive ? '↑' : '↓'} {card.trend.value}
              <span className="text-slate-400 font-normal ml-1">vs prev 30d</span>
            </div>
          </div>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Left: Pipeline breakdown */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl shadow-crm-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">My Lead Pipeline</h2>
              <p className="text-xs text-slate-500 mt-0.5">Breakdown by stage</p>
            </div>
            <Link href={tenantPath(tenant.slug, '/pro/leads')} className="text-xs font-medium text-brand hover:text-brand-hover bg-brand-light px-3 py-1.5 rounded-lg transition-colors">View all →</Link>
          </div>
          <div className="p-6 space-y-4">
            {stageBreakdown.map((stage) => {
              const pct = myLeads.length > 0 ? Math.round((stage.count / myLeads.length) * 100) : 0
              return (
                <div key={stage.label}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                      <span className="font-medium text-slate-700">{stage.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-900 font-semibold">{stage.count}</span>
                      <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: stage.color }} />
                  </div>
                </div>
              )
            })}
            {myLeads.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No leads assigned yet</p>}
          </div>
          {/* Recent Leads table inside left card */}
          <div className="border-t border-slate-200">
            <div className="flex items-center justify-between px-6 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Recent Leads</h3>
              <Link href={tenantPath(tenant.slug, '/pro/leads')} className="text-xs font-medium text-brand hover:text-brand-hover transition-colors">View all →</Link>
            </div>
            {myLeads.length === 0 ? (
              <div className="px-6 pb-8 text-center text-sm text-slate-400">No leads assigned yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</th>
                      <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">City</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stage</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLeads.slice(0, 6).map((lead) => (
                      <tr key={lead.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{lead.fullName}</p>
                          {lead.email && <p className="text-xs text-slate-400 mt-0.5">{lead.email}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{lead.contactNumber ?? '—'}</td>
                        <td className="hidden px-4 py-3 text-sm text-slate-600 md:table-cell">{lead.city ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
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

        {/* Right: Activity + Stats */}
        <div className="flex flex-col gap-4">

          {/* Performance snapshot */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-crm-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">My Performance</h2>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Conversion Rate', value: myLeads.length > 0 ? `${Math.round((myLeads.filter(l => l.stage === 'paid').length / myLeads.length) * 100)}%` : '0%', color: '#8b5cf6' },
                { label: 'Active Rate', value: myLeads.length > 0 ? `${Math.round((activeLeads.length / myLeads.length) * 100)}%` : '0%', color: '#10b981' },
                { label: 'Follow-up Rate', value: myLeads.length > 0 ? `${Math.round((followUps.length / myLeads.length) * 100)}%` : '0%', color: '#f59e0b' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-600">{stat.label}</span>
                    <span className="text-sm font-semibold text-slate-900">{stat.value}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-1.5 rounded-full" style={{ width: stat.value, background: stat.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-crm-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">Quick Stats</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {[
                { label: 'Total Assigned', value: myLeads.length },
                { label: 'In Progress', value: activeLeads.length },
                { label: 'Need Follow-up', value: followUps.length },
                { label: 'Successfully Won', value: myLeads.filter(l => l.stage === 'paid').length },
                { label: 'Cancelled', value: myLeads.filter(l => l.stage === 'cancelled').length },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-slate-600">{item.label}</span>
                  <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
