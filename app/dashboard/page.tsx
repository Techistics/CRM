import { auth, currentUser } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-950 text-white">
      <div className="flex items-center gap-3 text-xl font-medium">
        <UserButton />
        <span>Welcome, {user?.firstName ?? 'User'}</span>
      </div>
      <div className="rounded-lg border border-gray-700 bg-gray-900 px-6 py-4 text-sm text-gray-400 space-y-1">
        <p><span className="text-gray-500">User ID:</span> {userId}</p>
        <p><span className="text-gray-500">Email:</span> {user?.emailAddresses[0]?.emailAddress}</p>
        <p className="text-green-400 font-medium pt-1">✓ Clerk auth is working</p>
      </div>
    </main>
  )
}