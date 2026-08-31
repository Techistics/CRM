import { db } from '@/db'
import { leads, users } from '@/db/schema'
import { sql, and, eq, gte, lte } from 'drizzle-orm'
import Link from 'next/link'
import { requireTenantSession } from '@/lib/tenant-server'
import { tenantPath } from '@/lib/tenant-path'
import { getStageInfo, PIPELINE_STAGES } from '@/constants/pipeline-stages'
import {
  Users,
  Activity,
  Clock,
  Trophy,
  ArrowRight,
  BarChart2,
  ClipboardList,
  CheckCircle,
  XCircle,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'
import { ProPipelineDonut } from '@/components/pro/pro-pipeline-donut'
import type { DonutSegment } from '@/components/pro/pro-pipeline-donut'
import { ProStageBadge } from '@/components/pro/pro-stage-badge'

// ─── helpers ────────────────────────────────────────────────────────────────

function calcTrend(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? { value: '+100%', positive: true } : { value: '0%', positive: true }
  const pct = Math.round(((curr - prev) / prev) * 100)
  return { value: `${pct >= 0 ? '+' : ''}${pct}%`, positive: pct >= 0 }
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Stage groupings → 5 canonical dashboard buckets
const STAGE_BUCKET = (stage: string | null): 'new_lead' | 'follow_up' | 'active' | 'won' | 'cancelled' => {
  if (stage === 'new_lead') return 'new_lead'
  if (stage === 'follow_up') return 'follow_up'
  if (stage === 'cancelled') return 'cancelled'
  if (stage === 'paid') return 'won'
  return 'active'
}

// ─── page ───────────────────────────────────────────────────────────────────

export default async function ProOverviewPage() {
  const { tenant, dbUserId } = await requireTenantSession()

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, dbUserId))

  if (!dbUser) {
    return (
      <div className="p-8 text-crm-sm text-slate-500 dark:text-slate-400">
        Your profile could not be loaded. Try signing out and back in.
      </div>
    )
  }

  // ── All my leads ──────────────────────────────────────────────────────────
  const myLeads = await db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      email: leads.email,
      contactNumber: leads.contactNumber,
      city: leads.city,
      stage: leads.stage,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(
      and(
        eq(leads.tenantId, tenant.id),
        eq(leads.assignedTo, dbUserId),
      ),
    )

  // ── Derived buckets ───────────────────────────────────────────────────────
  const total = myLeads.length
  const activeLeads = myLeads.filter((l) => STAGE_BUCKET(l.stage) === 'active')
  const followUps = myLeads.filter((l) => l.stage === 'follow_up')
  const wonLeads = myLeads.filter((l) => l.stage === 'paid')
  const cancelledLeads = myLeads.filter((l) => l.stage === 'cancelled')
  const newLeads = myLeads.filter((l) => l.stage === 'new_lead')

  // ── Recent leads (5 most recent) ─────────────────────────────────────────
  const recentLeads = [...myLeads]
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })
    .slice(0, 5)

  // ── Trend comparison (prev 30 days vs current 30 days) ───────────────────
  const curr30Start = new Date()
  curr30Start.setDate(curr30Start.getDate() - 30)
  const prev30Start = new Date()
  prev30Start.setDate(prev30Start.getDate() - 60)
  const prev30End = new Date()
  prev30End.setDate(prev30End.getDate() - 30)

  const [currStats] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      active: sql<number>`COUNT(*) FILTER (WHERE stage NOT IN ('paid','cancelled'))::int`,
      won: sql<number>`COUNT(*) FILTER (WHERE stage = 'paid')::int`,
      followUp: sql<number>`COUNT(*) FILTER (WHERE stage = 'follow_up')::int`,
    })
    .from(leads)
    .where(and(eq(leads.tenantId, tenant.id), eq(leads.assignedTo, dbUserId), gte(leads.createdAt, curr30Start)))

  const [prevStats] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      active: sql<number>`COUNT(*) FILTER (WHERE stage NOT IN ('paid','cancelled'))::int`,
      won: sql<number>`COUNT(*) FILTER (WHERE stage = 'paid')::int`,
      followUp: sql<number>`COUNT(*) FILTER (WHERE stage = 'follow_up')::int`,
    })
    .from(leads)
    .where(and(eq(leads.tenantId, tenant.id), eq(leads.assignedTo, dbUserId), gte(leads.createdAt, prev30Start), lte(leads.createdAt, prev30End)))

  const trends = {
    total: calcTrend(Number(currStats?.total ?? 0), Number(prevStats?.total ?? 0)),
    active: calcTrend(Number(currStats?.active ?? 0), Number(prevStats?.active ?? 0)),
    followUp: calcTrend(Number(currStats?.followUp ?? 0), Number(prevStats?.followUp ?? 0)),
    won: calcTrend(Number(currStats?.won ?? 0), Number(prevStats?.won ?? 0)),
  }

  // ── KPI cards config ──────────────────────────────────────────────────────
  const kpiCards = [
    {
      label: 'MY TOTAL LEADS',
      value: total,
      trend: trends.total,
      progressPct: 100,
      iconBg: 'bg-blue-50 dark:bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
      barColor: 'bg-blue-500',
      trendColor: 'text-blue-600 dark:text-blue-400',
      Icon: Users,
    },
    {
      label: 'ACTIVE',
      value: activeLeads.length,
      trend: trends.active,
      progressPct: total > 0 ? Math.round((activeLeads.length / total) * 100) : 0,
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      barColor: 'bg-emerald-500',
      trendColor: 'text-emerald-600 dark:text-emerald-400',
      Icon: Activity,
    },
    {
      label: 'FOLLOW UPS',
      value: followUps.length,
      trend: trends.followUp,
      progressPct: total > 0 ? Math.round((followUps.length / total) * 100) : 0,
      iconBg: 'bg-orange-50 dark:bg-orange-500/10',
      iconColor: 'text-orange-600 dark:text-orange-400',
      barColor: 'bg-orange-500',
      trendColor: 'text-orange-600 dark:text-orange-400',
      Icon: Clock,
    },
    {
      label: 'WON',
      value: wonLeads.length,
      trend: trends.won,
      progressPct: total > 0 ? Math.round((wonLeads.length / total) * 100) : 0,
      iconBg: 'bg-violet-50 dark:bg-violet-500/10',
      iconColor: 'text-violet-600 dark:text-violet-400',
      barColor: 'bg-violet-500',
      trendColor: 'text-violet-600 dark:text-violet-400',
      Icon: Trophy,
    },
  ]

  // ── Pipeline donut segments ───────────────────────────────────────────────
  const stageCounts = new Map<string, number>()
  for (const l of myLeads) {
    const st = l.stage || 'new_lead'
    stageCounts.set(st, (stageCounts.get(st) || 0) + 1)
  }

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)

  const knownKeys = new Set<string>(PIPELINE_STAGES.map((s) => s.value))

  const donutSegments: DonutSegment[] = PIPELINE_STAGES
    .map((s) => {
      const c = stageCounts.get(s.value) || 0
      return {
        key: s.value,
        label: s.label,
        count: c,
        pct: pct(c),
        color: s.chartColor,
      }
    })
    .filter((seg) => seg.count > 0 || (['new_lead', 'follow_up', 'paid', 'cancelled'] as string[]).includes(seg.key))

  const FALLBACK_COLORS = ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981']
  let fallbackIdx = 0
  for (const [stKey, cnt] of stageCounts.entries()) {
    if (!knownKeys.has(stKey) && cnt > 0) {
      donutSegments.push({
        key: stKey,
        label: stKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        count: cnt,
        pct: pct(cnt),
        color: FALLBACK_COLORS[fallbackIdx % FALLBACK_COLORS.length],
      })
      fallbackIdx++
    }
  }

  // ── Performance metrics ───────────────────────────────────────────────────
  const conversionRate = total > 0 ? Math.round((wonLeads.length / total) * 100) : 0
  const activeRate = total > 0 ? Math.round((activeLeads.length / total) * 100) : 0
  const followUpRate = total > 0 ? Math.round((followUps.length / total) * 100) : 0

  const performanceMetrics = [
    { label: 'Conversion Rate', value: conversionRate, barClass: 'bg-blue-500',    trackClass: 'bg-blue-500' },
    { label: 'Active Rate',     value: activeRate,     barClass: 'bg-emerald-500', trackClass: 'bg-emerald-500' },
    { label: 'Follow-up Rate',  value: followUpRate,   barClass: 'bg-orange-500',  trackClass: 'bg-orange-500' },
  ]

  // ── Quick stats rows ──────────────────────────────────────────────────────
  const quickStats = [
    { label: 'Total Assigned',   value: total,                    dotClass: 'bg-blue-500',    Icon: ClipboardList },
    { label: 'In Progress',      value: activeLeads.length,       dotClass: 'bg-emerald-500', Icon: TrendingUp },
    { label: 'Need Follow-up',   value: followUps.length,         dotClass: 'bg-orange-500',  Icon: Clock },
    { label: 'Successfully Won', value: wonLeads.length,          dotClass: 'bg-violet-500',  Icon: CheckCircle },
    { label: 'Cancelled',        value: cancelledLeads.length,    dotClass: 'bg-red-500',     Icon: XCircle },
  ]

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[1520px] mx-auto space-y-2.5">

      {/* ══════════════════════════════════════════════════════════════════
          1. OVERVIEW HEADER
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-crm-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
            Overview
          </h1>
          <p className="text-crm-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Welcome back, {dbUser.name}
          </p>
        </div>
        <Link
          href={tenantPath(tenant.slug, '/pro/leads')}
          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-crm-sm bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-crm-xs font-semibold transition-colors"
        >
          My Leads
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. KPI CARDS
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {kpiCards.map((card) => {
          const { Icon } = card
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-crm-md p-3 shadow-crm-xs"
            >
              {/* Label + Icon */}
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400 leading-none">
                    {card.label}
                  </p>
                  <p className="text-crm-2xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 tabular-nums leading-none">
                    {card.value.toLocaleString()}
                  </p>
                </div>
                <div className={`w-7 h-7 rounded-crm-sm ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-3.5 w-3.5 ${card.iconColor}`} />
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-1 rounded-full transition-all duration-500 ${card.barColor}`}
                  style={{ width: `${card.progressPct}%` }}
                />
              </div>

              {/* Trend */}
              <div className="mt-2 flex items-center gap-1">
                <span
                  className={`text-[9px] font-semibold tabular-nums ${
                    card.trend.positive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}
                >
                  {card.trend.positive ? '↑' : '↓'} {card.trend.value}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">
                  vs last month
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3. ANALYTICS ROW — Pipeline (2/3) + Performance (1/3)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">

        {/* ── My Lead Pipeline ── */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-crm-md shadow-crm-xs overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-crm-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                My Lead Pipeline
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Breakdown by stage
              </p>
            </div>
            <BarChart2 className="h-4 w-4 text-slate-300 dark:text-slate-600" />
          </div>

          {/* Donut + legend */}
          <div className="p-3.5">
            {total === 0 ? (
              <p className="text-crm-xs text-slate-400 dark:text-slate-500 text-center py-6">
                No leads assigned yet
              </p>
            ) : (
              <ProPipelineDonut
                segments={donutSegments}
                total={total}
                size={148}
                thickness={28}
              />
            )}
          </div>
        </div>

        {/* ── My Performance ── */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-crm-md shadow-crm-xs overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-crm-sm bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-crm-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                My Performance
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="p-3.5 space-y-4">
            {performanceMetrics.map((metric) => (
              <div key={metric.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    {metric.label}
                  </span>
                  <span className="text-[11px] font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {metric.value}%
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-1 rounded-full transition-all duration-500 ${metric.barClass}`}
                    style={{ width: `${metric.value}%` }}
                  />
                </div>
              </div>
            ))}

            {total === 0 && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center pt-2">
                No data yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          4. BOTTOM ROW — Recent Leads (2/3) + Quick Stats (1/3)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">

        {/* ── Recent Leads ── */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-crm-md shadow-crm-xs overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
            <p className="text-crm-sm font-semibold text-slate-900 dark:text-slate-100">
              Recent Leads
            </p>
            <Link
              href={tenantPath(tenant.slug, '/pro/leads')}
              className="text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-0.5"
            >
              View all
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Table */}
          {recentLeads.length === 0 ? (
            <div className="px-4 py-8 text-center text-crm-xs text-slate-400 dark:text-slate-500">
              No leads assigned yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="px-3.5 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400 dark:text-slate-500 w-[34%]">
                      Name
                    </th>
                    <th className="px-3.5 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400 dark:text-slate-500 w-[27%]">
                      Contact
                    </th>
                    <th className="hidden md:table-cell px-3.5 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400 dark:text-slate-500 w-[15%]">
                      City
                    </th>
                    <th className="px-3.5 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400 dark:text-slate-500 w-[14%]">
                      Stage
                    </th>
                    <th className="px-3.5 py-2 text-left text-[9px] font-semibold uppercase tracking-[0.05em] text-slate-400 dark:text-slate-500 w-[10%]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((lead, idx) => {
                    const stageInfo = getStageInfo(lead.stage)
                    const avatarInitials = initials(lead.fullName)
                    return (
                      <tr
                        key={lead.id}
                        className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Name + Avatar */}
                        <td className="px-3.5 py-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[8px] font-bold"
                              style={{ background: stageInfo.chartColor }}
                            >
                              {avatarInitials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate leading-tight">
                                {lead.fullName}
                              </p>
                              {lead.email && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5">
                                  {lead.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-3.5 py-2 text-[10px] text-slate-500 dark:text-slate-400">
                          {lead.contactNumber ?? '—'}
                        </td>

                        {/* City */}
                        <td className="hidden md:table-cell px-3.5 py-2 text-[10px] text-slate-500 dark:text-slate-400">
                          {lead.city ?? '—'}
                        </td>

                        {/* Stage badge */}
                        <td className="px-3.5 py-2">
                          <ProStageBadge
                            label={stageInfo.label}
                            badgeClasses={stageInfo.badgeClasses}
                            mutedClasses={stageInfo.mutedClasses}
                          />
                        </td>

                        {/* Action */}
                        <td className="px-3.5 py-2">
                          <Link
                            href={tenantPath(tenant.slug, `/pro/leads/${lead.id}`)}
                            className="text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-0.5"
                          >
                            Details
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Quick Stats ── */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-crm-md shadow-crm-xs overflow-hidden">
          {/* Header */}
          <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
            <p className="text-crm-sm font-semibold text-slate-900 dark:text-slate-100">
              Quick Stats
            </p>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {quickStats.map((stat) => {
              const { Icon } = stat
              return (
                <div
                  key={stat.label}
                  className="flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${stat.dotClass}`} />
                    <Icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                      {stat.label}
                    </span>
                  </div>
                  <span className="text-[12px] font-bold tabular-nums text-slate-900 dark:text-slate-100 flex-shrink-0 ml-2">
                    {stat.value.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

    </div>
  )
}