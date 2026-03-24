import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4">
      <SignUp
        path="/sign-up"
        routing="path"
        forceRedirectUrl="/"
        signInUrl="/sign-in"
      />
      <p className="mt-8 text-center text-sm text-gray-400">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-medium text-emerald-400 hover:text-emerald-300">
          Sign in
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-gray-600 max-w-sm">
        After you sign up, you’ll choose Pro or Admin and wait for an administrator to approve your access.
      </p>
    </main>
  )
}
