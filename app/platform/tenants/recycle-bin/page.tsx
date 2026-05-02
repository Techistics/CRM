import Link from 'next/link'
import { asc, isNotNull } from 'drizzle-orm'
import { ArrowLeft } from 'lucide-react'

import { db } from '@/db'
import { tenants } from '@/db/schema'
import { RestoreTenantButton } from './RestoreTenantButton'
import { HardDeleteTenantButton } from './HardDeleteTenantButton'

export default async function RecycleBinPage() {
  const deletedTenants = await db
    .select()
    .from(tenants)
    .where(isNotNull(tenants.deletedAt))
    .orderBy(asc(tenants.name))

  function getInitials(name: string) {
    const chunks = name.trim().split(/\s+/).filter(Boolean)
    if (chunks.length === 0) return 'WS'
    if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase()
    return `${chunks[0][0]}${chunks[1][0]}`.toUpperCase()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/platform/tenants"
          className="flex h-9 w-9 items-center justify-center rounded-[8px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] text-[var(--muted-text)] hover:bg-[var(--main-bg)] hover:text-[var(--text-strong)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-[20px] font-medium text-[var(--text-strong)]">Recycle Bin</h1>
          <p className="mt-1 text-[13px] text-[var(--muted-text)]">
            Restore or permanently delete hidden workspaces.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        {deletedTenants.map((t) => (
          <div
            key={t.id}
            className="overflow-hidden rounded-[10px] border-[0.5px] border-[rgba(226,75,74,0.3)] bg-[rgba(226,75,74,0.02)] px-5 py-4 opacity-80 transition-opacity hover:opacity-100"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[rgba(226,75,74,0.1)] text-[14px] font-medium text-[#E24B4A]">
                  {getInitials(t.name)}
                </div>
                <div className="space-y-1">
                  <h3 className="text-[14px] font-medium text-[var(--text-strong)] line-through decoration-[var(--muted-text)]">{t.name}</h3>
                  <code className="rounded-[4px] bg-foreground/5 px-2 py-0.5 text-[11px] text-[var(--muted-text)]">
                    Deleted at: {t.deletedAt?.toLocaleDateString()}
                  </code>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RestoreTenantButton tenantId={t.id} />
                <HardDeleteTenantButton tenantId={t.id} />
              </div>
            </div>
          </div>
        ))}

        {deletedTenants.length === 0 && (
          <div className="rounded-[10px] border-[0.5px] border-dashed border-[var(--card-border-color)] bg-[var(--card-bg)] px-6 py-10 text-center">
            <p className="text-[13px] text-[var(--muted-text)]">The recycle bin is empty.</p>
          </div>
        )}
      </div>
    </div>
  )
}
