import { redirect } from 'next/navigation'

import { isPlatformSuperAdmin } from '@/lib/platform-role'
import { AdminShell } from '@/app/platform/_components/AdminShell'

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ok = await isPlatformSuperAdmin()
  if (!ok) redirect('/')

  return <AdminShell>{children}</AdminShell>
}
