import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserRole } from '../lib/role'

export default async function Home() {
  const { userId } = await auth()

  if (!userId) redirect('/sign-in')

  const role = await getUserRole()

  if (role === 'admin') redirect('/admin/overview')
  if (role === 'pro') redirect('/pro/overview')

  redirect('/request-role')
}