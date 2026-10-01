import { requirePermissionSession } from '@/lib/tenant-server'
import FinancePageClient from '../../admin/finance/FinancePageClient'

export const metadata = {
  title: 'Finance | Consulty',
  description: 'Revenue records, commission calculator and financial overview',
}

export default async function ProFinancePage() {
  const { tenant } = await requirePermissionSession('finance.view')
  return <FinancePageClient tenantSlug={tenant.slug} />
}
