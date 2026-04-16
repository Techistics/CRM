import Link from 'next/link'

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 text-sm">
          <Link href="/platform" className="font-semibold">
            Platform
          </Link>
          <Link href="/platform/tenants" className="text-muted-foreground hover:text-foreground">
            Workspaces
          </Link>
          <Link href="/" className="ml-auto text-muted-foreground hover:text-foreground">
            App home
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  )
}