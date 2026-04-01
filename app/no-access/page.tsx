import Link from 'next/link'

export default function NoAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/50 px-6">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-xl font-semibold">No access to this workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is not a member of this organization in Clerk, or the
          workspace is inactive. Ask your administrator to invite you to the
          correct organization.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Back to home
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  )
}
