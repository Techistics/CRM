import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/50 px-4">
      <SignIn
        path="/sign-in"
        routing="path"
        fallbackRedirectUrl="/"
        signUpUrl="/sign-up"
      />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link href="/sign-up" className="font-medium text-primary hover:opacity-90">
          Create an account
        </Link>
      </p>
    </main>
  )
}
