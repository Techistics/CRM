import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { isPlatformSuperAdmin } from '@/lib/platform-role'
import { AdminShell } from '@/app/platform/_components/AdminShell'

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Next.js sets x-invoke-path or x-pathname via middleware — use next-url referer fallback
  const headersList = await headers()
  const nextUrl = headersList.get('x-pathname') ?? headersList.get('x-invoke-path') ?? ''

  // Exclude sign-in page from auth check
  if (nextUrl.startsWith('/platform/sign-in')) {
    return <>{children}</>
  }

  const ok = await isPlatformSuperAdmin()
  if (!ok) {
    redirect('/platform/sign-in')
  }

  return <AdminShell>{children}</AdminShell>
}
