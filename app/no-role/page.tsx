import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

/** Legacy route: signed-in users without access use `/request-role` instead. */
export default async function NoRolePage() {
  const { userId } = await auth()
  if (userId) redirect('/request-role')

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <h1 className="text-xl font-semibold">Access not configured</h1>
        <p className="mt-2 text-sm text-gray-300">You’re not signed in.</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/sign-in"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-950 hover:bg-gray-200"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Create an account
          </Link>
        </div>
      </div>
    </main>
  )
}
