'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { DashboardCard, DashboardCardBody, DashboardCardHeader } from './ui/dashboard-card'
import { useChartPalette } from './lib/chart-palette'

export function LeadStatusChart({
  active,
  cold,
  dead,
}: {
  active: number
  cold: number
  dead: number
}) {
  const { series: colors } = useChartPalette()
  
  const data = [
    { name: 'Active', value: active },
    { name: 'Cold', value: cold },
    { name: 'Dead', value: dead },
  ]
  const total = active + cold + dead

  return (
    <DashboardCard className="flex h-full flex-col">
      <DashboardCardHeader
        title="Lead Status"
        description="Active vs Cold vs Dead leads"
      />
      <DashboardCardBody className="flex flex-1 flex-col items-center justify-center">
        <div className="relative h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="80%"
                paddingAngle={2}
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index % colors.length] ?? colors[0]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const { name, value } = payload[0]
                  const pct = total > 0 ? Math.round((Number(value) / total) * 100) : 0
                  return (
                    <div className="rounded-consulty-md border border-consulty-border bg-consulty-surface-raised px-3 py-2 text-crm-xs shadow-consulty-md dark:border-consulty-border dark:bg-consulty-surface-raised">
                      <p className="font-semibold text-consulty-text-primary">
                        {name}: {value} ({pct}%)
                      </p>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-crm-xl font-bold tabular-nums text-consulty-text-primary">
              {total.toLocaleString()}
            </span>
            <span className="text-crm-xs font-semibold uppercase text-consulty-text-muted">
              Leads
            </span>
          </div>
        </div>
        <div className="mt-4 flex w-full flex-col gap-2">
          {data.map((item, i) => {
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
            return (
              <div key={item.name} className="flex items-center justify-between text-crm-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: colors[i % colors.length] }}
                  />
                  <span className="text-consulty-text-secondary">{item.name}</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-semibold text-consulty-text-primary">{item.value}</span>
                  <span className="w-8 text-right text-consulty-text-muted">{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </DashboardCardBody>
    </DashboardCard>
  )
}
