import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/sign-in')
  if (session.role === 'super_admin') redirect('/platform')

  redirect('/')
}