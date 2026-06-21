'use client'

import { useState, useTransition } from 'react'
import { DeleteTenantButton } from './DeleteTenantButton'
import { SubmitInviteButton } from './SubmitInviteButton'
import { inviteWorkspaceUserAction, toggleTenantStatusAction } from '@/app/platform/actions'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type Tenant = {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended'
}

function PauseTenantButton({ tenantId, currentStatus }: { tenantId: string; currentStatus: 'active' | 'suspended' }) {
  const [isPending, startTransition] = useTransition()
  const isPaused = currentStatus === 'suspended'
  const newStatus = isPaused ? 'active' : 'suspended'
  const label = isPaused ? 'Resume' : 'Pause'
  const pendingLabel = isPaused ? 'Resuming...' : 'Pausing...'

  const handleClick = () => {
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('tenantId', tenantId)
        formData.append('newStatus', newStatus)
        await toggleTenantStatusAction(formData)
        toast.success(`Workspace ${isPaused ? 'resumed' : 'paused'} successfully`)
      } catch {
        toast.error(`Failed to ${label.toLowerCase()} workspace`)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center gap-1 rounded-[8px] border-[0.5px] px-3 py-1.5 text-[12px] font-semibold transition-all active:scale-95 disabled:opacity-50 ${
        isPaused
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400'
      }`}
    >
      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {isPending ? pendingLabel : label}
    </button>
  )
}

function getInitials(name: string) {
  const chunks = name.trim().split(/\s+/).filter(Boolean)
  if (chunks.length === 0) return 'WS'
  if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase()
  return `${chunks[0][0]}${chunks[1][0]}`.toUpperCase()
}

export function TenantListClient({
  tenants,
  memberCountByTenant,
}: {
  tenants: Tenant[]
  memberCountByTenant: Record<string, number>
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [switchingSlug, setSwitchingSlug] = useState<string | null>(null)

  const handleSwitchTenant = async (slug: string) => {
    setSwitchingSlug(slug)
    try {
      const res = await fetch('/api/admin/switch-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantSlug: slug }),
      })
      if (!res.ok) throw new Error('Switch failed')
      window.location.href = `/t/${slug}/admin/overview`
    } catch {
      import('sonner').then(({ toast }) => toast.error('Failed to enter workspace'))
      setSwitchingSlug(null)
    }
  }

  const selectedCount = selectedIds.size
  const selectedAll = tenants.length > 0 && tenants.every((t) => selectedIds.has(t.id))
  const selectedSome = tenants.some((t) => selectedIds.has(t.id))

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(tenants.map((t) => t.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds)
    if (checked) next.add(id)
    else next.delete(id)
    setSelectedIds(next)
  }

  const [isPending, startTransitionBulk] = useState(false)
  
  const handleBulkDelete = () => {
    startTransitionBulk(true)
    import('@/app/platform/actions').then(({ bulkDeleteWorkspaceAction }) => {
      const formData = new FormData()
      formData.append('tenantIds', Array.from(selectedIds).join(','))
      bulkDeleteWorkspaceAction(formData)
        .then(() => {
          toast.success(`Deleted ${selectedCount} workspaces`)
          setSelectedIds(new Set())
        })
        .catch(() => {
          toast.error('Failed to delete workspaces')
        })
        .finally(() => startTransitionBulk(false))
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={selectedAll ? true : selectedSome ? 'indeterminate' : false}
            onCheckedChange={(checked) => toggleAll(!!checked)}
            aria-label="Select all workspaces"
          />
          <span className="text-[13px] font-semibold text-[var(--text-main)]">
            {selectedCount > 0 ? `${selectedCount} selected` : 'Select all'}
          </span>
        </div>
        
        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              disabled={isPending}
              className="rounded-[8px] border-[0.5px] border-[rgba(239,68,68,0.2)] bg-red-500/10 px-4 py-2 text-[12px] font-bold text-red-500 transition-all hover:bg-red-500/20 active:scale-95 disabled:opacity-50 dark:border-red-500/30"
            >
              {isPending ? 'Deleting...' : 'Delete Selected'}
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-3">
        {tenants.map((t) => (
          <div
            key={t.id}
            className={`overflow-hidden rounded-[var(--radius-card)] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] px-6 py-5 shadow-sm transition-all hover:shadow-md ${
              selectedIds.has(t.id) ? 'ring-2 ring-[var(--accent-color)] ring-offset-2 ring-offset-[var(--background)]' : ''
            }`}
          >
            <div className="flex items-center gap-5">
              <Checkbox
                checked={selectedIds.has(t.id)}
                onCheckedChange={(checked) => toggleOne(t.id, !!checked)}
                aria-label={`Select ${t.name}`}
              />
              
              <div className="flex flex-1 items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[var(--accent-color)]/15 text-[15px] font-bold text-[var(--accent-text)] shadow-inner">
                    {getInitials(t.name)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-bold text-[var(--text-strong)]">{t.name}</h3>
                      {t.status === 'suspended' && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          Paused
                        </span>
                      )}
                    </div>
                    <code className="rounded-[4px] bg-[var(--foreground)]/5 px-2 py-0.5 text-[11px] font-medium text-[var(--muted-text)]">
                      {t.slug}
                    </code>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[var(--foreground)]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--muted-text)]">
                    {memberCountByTenant[t.id] ?? 0} members
                  </span>
                  <button
                    onClick={() => handleSwitchTenant(t.slug)}
                    disabled={switchingSlug !== null}
                    className="rounded-[8px] bg-[var(--accent-color)] px-4 py-2 text-[12px] font-semibold text-[var(--accent-text)] shadow-sm transition-all hover:brightness-95 active:scale-95 disabled:opacity-50"
                  >
                    {switchingSlug === t.slug ? 'Entering...' : 'Enter workspace'}
                  </button>
                  <PauseTenantButton tenantId={t.id} currentStatus={t.status} />
                  <DeleteTenantButton tenantId={t.id} />
                </div>
              </div>
            </div>

            <div className="my-4 border-t-[0.5px] border-[var(--card-border-color)]" />

            <div>
              <p className="mb-3 pl-[38px] text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted-text)]">
                Manual invite
              </p>
              <form action={inviteWorkspaceUserAction} className="flex flex-wrap items-end gap-3 pl-[38px]">
                <input type="hidden" name="tenantId" value={t.id} />
                <div className="min-w-[240px] flex-1">
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    className="h-10 w-full rounded-[8px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] px-4 text-[13px] font-medium text-[var(--text-strong)] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-color)]/50 placeholder:text-[var(--muted-text)]"
                  />
                </div>
                <div>
                  <select
                    name="role"
                    defaultValue="PRO"
                    className="h-10 rounded-[8px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--main-bg)] px-4 text-[13px] font-medium text-[var(--text-strong)] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-color)]/50"
                  >
                    <option value="PRO">Pro (Counselor)</option>
                    <option value="ADMIN">Admin (Workspace Owner)</option>
                  </select>
                </div>
                <SubmitInviteButton />
              </form>
            </div>
          </div>
        ))}

        {tenants.length === 0 && (
          <div className="rounded-[var(--radius-card)] border-[1px] border-dashed border-[var(--card-border-color)] bg-[var(--card-bg)] px-6 py-12 text-center shadow-inner">
            <p className="text-[14px] font-medium text-[var(--muted-text)]">No workspaces found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
