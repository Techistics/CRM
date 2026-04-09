import Link from 'next/link'

export default function PlatformHomePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Platform admin</h1>
      <p className="text-muted-foreground text-sm mt-2 max-w-xl">
        Create and manage customer workspaces. Each workspace maps to a Clerk
        Organization and a subdomain (e.g.{' '}
        <code className="text-xs bg-muted px-1 rounded">slug.yourdomain.com</code>).
      </p>
      <Link
        href="/platform/tenants"
        className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Manage workspaces
      </Link>
    </div>
  )
}
