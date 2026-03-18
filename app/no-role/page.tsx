import { auth } from '@clerk/nextjs/server'
import { SignOutButton } from '@clerk/nextjs'
import Link from 'next/link'

export default async function NoRolePage() {
  const { userId } = await auth()

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <h1 className="text-xl font-semibold">Access not configured</h1>
        <p className="mt-2 text-sm text-gray-300">
          {userId
            ? "You're signed in, but your account doesn't have a role assigned yet."
            : "You're not signed in."}
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-950 hover:bg-gray-200"
          >
            Go to home
          </Link>
          {userId ? (
            <SignOutButton redirectUrl="/sign-in">
              <button className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
                Sign out
              </button>
            </SignOutButton>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}


