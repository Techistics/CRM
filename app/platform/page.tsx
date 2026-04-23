import Link from 'next/link'

export default function PlatformHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-medium text-[var(--text-strong)]">Platform dashboard</h1>
        <p className="mt-1 max-w-xl text-[13px] text-[var(--muted-text)]">
          Manage platform workspaces and global administration controls from one place.
        </p>
      </div>

      <div className="rounded-[10px] border-[0.5px] border-[var(--card-border-color)] bg-[var(--card-bg)] p-5">
        <h2 className="text-[14px] font-medium text-[var(--text-strong)]">Workspace administration</h2>
        <p className="mt-1 text-[12px] text-[var(--muted-text)]">
          Create and manage workspaces with unique subdomains like slug.yourdomain.com.
        </p>
        <Link
          href="/platform/tenants"
          className="mt-4 inline-flex rounded-[8px] bg-[#CBEF7F] px-[14px] py-[7px] text-[13px] font-medium text-[#2C5000]"
        >
          Manage workspaces
        </Link>
      </div>
    </div>
  )
}
