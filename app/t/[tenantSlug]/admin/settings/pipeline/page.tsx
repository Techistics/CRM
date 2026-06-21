import { requireTenantAdminSession } from '@/lib/tenant-server'
import { db } from '@/db'
import { pipelineSubStatuses, pipelineStages } from '@/db/schema'
import { eq } from 'drizzle-orm'
import SubStatusSettingsClient from './SubStatusSettingsClient'
import PipelineStagesEditor from '@/components/admin/PipelineStagesEditor'

export default async function PipelineSettingsPage() {
  const { tenant } = await requireTenantAdminSession()

  const subStatuses = await db
    .select()
    .from(pipelineSubStatuses)
    .where(eq(pipelineSubStatuses.tenantId, tenant.id))
    .orderBy(pipelineSubStatuses.stageKey, pipelineSubStatuses.sortOrder)

  const tenantStages = await db
    .select({ key: pipelineStages.key, label: pipelineStages.label, sortOrder: pipelineStages.sortOrder })
    .from(pipelineStages)
    .where(eq(pipelineStages.tenantId, tenant.id))
    .orderBy(pipelineStages.sortOrder)

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-[#0da2e7] dark:text-slate-100">Pipeline Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">Manage your organization's pipeline stages and sub-statuses.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-crm-sm p-6 dark:bg-[#0f172a] dark:border-slate-700">
        <PipelineStagesEditor />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-crm-sm p-6 dark:bg-[#0f172a] dark:border-slate-700">
        <SubStatusSettingsClient initialSubStatuses={subStatuses} tenantStages={tenantStages} />
      </div>
    </div>
  )
}