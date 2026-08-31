'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DashboardCard, DashboardCardBody, DashboardCardHeader } from './ui/dashboard-card'
import type { TeamPerformanceRow } from '@/types/dashboard'

export type { TeamPerformanceRow }

type TeamPerformanceTableProps = {
  rows: TeamPerformanceRow[]
  tenantSlug: string
  className?: string
}

function ConversionCell({ rate }: { rate: number | null }) {
  const value = rate ?? 0
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className="flex min-w-20 flex-col items-center gap-1">
      <span className="text-crm-xs font-medium tabular-nums text-consulty-text-primary">{value}%</span>
      <div className="h-1 w-full max-w-16 overflow-hidden rounded-full bg-consulty-border-subtle dark:bg-consulty-border">
        <div
          className="h-full rounded-full bg-consulty-primary transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

export function TeamPerformanceTable({ rows, tenantSlug, className }: TeamPerformanceTableProps) {
  const router = useRouter()

  return (
    <DashboardCard className={cn('overflow-hidden', className)}>
      <DashboardCardHeader
        title="Team Performance"
        description="Counselor accountability and conversion metrics"
      />
      <DashboardCardBody className="p-0">
        <div className="crm-table-scroll">
          <Table>
            <TableHeader className="border-b border-consulty-border-subtle bg-consulty-surface-subtle dark:border-consulty-border dark:bg-consulty-surface-subtle/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-3 py-2 text-crm-xs font-medium text-consulty-text-muted sm:px-4">
                  Counselor
                </TableHead>
                <TableHead className="px-2 py-2 text-center text-crm-xs font-medium text-consulty-text-muted">
                  Total
                </TableHead>
                <TableHead className="px-2 py-2 text-center text-crm-xs font-medium text-consulty-text-muted">
                  Won
                </TableHead>
                <TableHead className="px-2 py-2 text-center text-crm-xs font-medium text-consulty-warning">
                  Cold
                </TableHead>
                <TableHead className="px-2 py-2 text-center text-crm-xs font-medium text-consulty-danger">
                  Dead
                </TableHead>
                <TableHead className="px-2 py-2 text-center text-crm-xs font-medium text-consulty-text-muted">
                  Conversion %
                </TableHead>
                <TableHead className="px-3 py-2 text-crm-xs font-medium text-consulty-text-muted sm:px-4">
                  Last Activity
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((agent) => (
                <TableRow
                  key={agent.id}
                  className="border-consulty-border-subtle hover:bg-consulty-surface-subtle/80 dark:border-consulty-border dark:hover:bg-consulty-surface-raised/50"
                >
                  <TableCell className="px-3 py-2.5 sm:px-4">
                    <div className="flex min-w-36 items-center gap-2">
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-consulty-primary-soft text-crm-xs font-bold text-consulty-primary dark:bg-consulty-primary-soft/30">
                        {(agent.name?.[0] ?? 'U').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-crm-xs font-semibold text-consulty-text-primary">
                          {agent.name}
                        </p>
                        <p className="hidden truncate text-crm-xs text-consulty-text-muted sm:block">
                          {agent.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-2.5 text-center text-crm-xs tabular-nums text-consulty-text-secondary">
                    {Number(agent.total_leads ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="px-2 py-2.5 text-center">
                    <span className="text-crm-xs font-medium tabular-nums text-consulty-success">
                      {Number(agent.won ?? 0).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-2.5 text-center">
                    <span
                      className={cn(
                        'inline-flex rounded-consulty-sm px-1.5 py-0.5 text-crm-xs font-medium tabular-nums',
                        Number(agent.cold_leads ?? 0) > 0
                          ? 'bg-consulty-warning-soft text-consulty-warning dark:bg-consulty-warning-soft/30'
                          : 'text-consulty-text-disabled',
                      )}
                    >
                      {Number(agent.cold_leads ?? 0)}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-2.5 text-center">
                    <span
                      className={cn(
                        'inline-flex rounded-consulty-sm px-1.5 py-0.5 text-crm-xs font-medium tabular-nums',
                        Number(agent.dead_leads ?? 0) > 0
                          ? 'bg-consulty-danger-soft text-consulty-danger dark:bg-consulty-danger-soft/30'
                          : 'text-consulty-text-disabled',
                      )}
                    >
                      {Number(agent.dead_leads ?? 0)}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-2.5">
                    <ConversionCell rate={agent.conversion_rate} />
                  </TableCell>
                  <TableCell
                    suppressHydrationWarning
                    className="px-3 py-2.5 text-crm-xs text-consulty-text-muted sm:px-4"
                  >
                    {agent.last_activity
                      ? `${formatDistanceToNow(new Date(agent.last_activity))} ago`
                      : 'Never'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/t/${tenantSlug}/admin/team`)}
          className="flex w-full items-center justify-center gap-1 border-t border-consulty-border-subtle py-2.5 text-crm-xs font-medium text-consulty-primary transition-colors hover:bg-consulty-surface-subtle dark:border-consulty-border dark:hover:bg-consulty-surface-raised/50"
        >
          View all counselors
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </DashboardCardBody>
    </DashboardCard>
  )
}
