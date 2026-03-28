import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4">
      <SignIn
        path="/sign-in"
        routing="path"
        forceRedirectUrl="/"
        signUpUrl="/sign-up"
      />
      <p className="mt-8 text-center text-sm text-gray-400">
        No account?{' '}
        <Link href="/sign-up" className="font-medium text-emerald-400 hover:text-emerald-300">
          Create an account
        </Link>
      </p>
    </main>
  )
}
