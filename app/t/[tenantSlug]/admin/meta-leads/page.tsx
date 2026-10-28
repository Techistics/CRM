import { Suspense } from 'react'

import MetaLeadsClient from './MetaLeadsClient'
import { getTenantPipeline } from '@/lib/pipeline/config'
import { requirePermissionSession } from '@/lib/tenant-server'

export default async function MetaLeadsPage() {
  const { tenant } = await requirePermissionSession('leads.assign')
  const pipeline = await getTenantPipeline(tenant.id)
  const stageLabels = Object.fromEntries(pipeline.stages.map((stage) => [stage.key, stage.label]))

  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-slate-500">Loading Meta Leads…</div>}>
      <MetaLeadsClient tenantSlug={tenant.slug} stageLabels={stageLabels} />
    </Suspense>
  )
}
