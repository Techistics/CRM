import Link from 'next/link'

export default function PlatformHomePage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-[22px] font-bold text-[var(--text-strong)] tracking-tight">Platform Dashboard</h1>
        <p className="max-w-xl text-[14px] font-medium text-[var(--muted-text)]">
          Manage platform workspaces and global administration controls from one place.
        </p>
      </div>

      <div className="rounded-[var(--radius-card)] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] p-6 shadow-sm transition-all hover:shadow-md">
        <div className="max-w-lg space-y-2">
          <h2 className="text-[16px] font-bold text-[var(--text-strong)]">Workspace Administration</h2>
          <p className="text-[13px] font-medium text-[var(--muted-text)] leading-relaxed">
            Create and manage multi-tenant workspaces with unique subdomains, branding, and team isolation.
          </p>
        </div>
        <Link
          href="/platform/tenants"
          className="mt-6 inline-flex rounded-[8px] bg-[var(--accent-color)] px-[18px] py-[9px] text-[13px] font-semibold text-[var(--accent-text)] shadow-sm transition-all hover:brightness-95 active:scale-95"
        >
          Manage workspaces
        </Link>
      </div>
    </div>
  )
}
