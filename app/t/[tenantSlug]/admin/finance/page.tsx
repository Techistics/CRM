import { requirePermissionSession } from '@/lib/tenant-server'
import FinancePageClient from './FinancePageClient'

export const metadata = {
  title: 'Finance | Consulty',
  description: 'Revenue records, commission calculator and financial overview',
}

export default async function FinancePage() {
  const { tenant } = await requirePermissionSession('finance.view')
  return <FinancePageClient tenantSlug={tenant.slug} />
}
